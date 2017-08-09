'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _initGL = require('./initGL');

var _initGL2 = _interopRequireDefault(_initGL);

var _newBuffer = require('./newBuffer');

var _newBuffer2 = _interopRequireDefault(_newBuffer);

var _texture = require('./texture');

var _texture2 = _interopRequireDefault(_texture);

var _shadercode = require('./shadercode');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _frameBufferSetTexture(gl, fbo, nTexture, dim) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  // Types arrays speed this up tremendously.
  //var nTexture = createTexture(gl, new Int32Array(length), dim);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nTexture, 0);

  // Test for mobile bug MDN->WebGL_best_practices, bullet 7
  var frameBufferStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE;

  if (!frameBufferStatus) throw new Error('turbojs: Error attaching float texture to framebuffer. Your device is probably incompatible. Error info: ' + frameBufferStatus.message);
}
function alloc(sz) {
  // A sane limit for most GPUs out there.
  // JS falls apart before GLSL limits could ever be reached.
  /*
  if (sz > 16777216)
    throw new Error("turbojs: Whoops, the maximum array size is exceeded!");
    */

  var ns = Math.pow(Math.pow(2, Math.ceil(Math.log(sz) / 1.386) - 1), 2);
  return {
    //data : new Int32Array(ns * 16),
    data: new Int32Array(sz),
    length: sz
  };
}

var _class = function () {
  function _class(length, dim) {
    _classCallCheck(this, _class);

    this.gl = (0, _initGL2.default)();
    var gl = this.gl;
    this.dim = dim;
    this.programs = new Map();
    this.ipt = alloc(length);

    // GPU texture buffer from JS typed array
    this.buffers = {
      position: (0, _newBuffer2.default)(gl, [-1, -1, 1, -1, 1, 1, -1, 1]),
      texture: (0, _newBuffer2.default)(gl, [0, 0, 1, 0, 1, 1, 0, 1]),
      index: (0, _newBuffer2.default)(gl, [1, 2, 0, 3, 0, 2], Uint16Array, gl.ELEMENT_ARRAY_BUFFER)
    };

    this.attrib = {
      position: 0,
      texture: 1
    };

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this._bindBuffers(gl);
    gl.bindVertexArray(null);
    this.vertexShader = this._createVertexShader(gl);
    this.framebuffer = gl.createFramebuffer();
    this.texture0 = (0, _texture2.default)(gl, this.ipt.data, this.dim);
    this.texture1 = (0, _texture2.default)(gl, new Int32Array(length), this.dim);
  }

  _createClass(_class, [{
    key: '_bindBuffers',
    value: function _bindBuffers(gl) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texture);
      gl.enableVertexAttribArray(this.attrib.texture);
      gl.vertexAttribPointer(this.attrib.texture, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
      gl.enableVertexAttribArray(this.attrib.position);
      gl.vertexAttribPointer(this.attrib.position, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
    }
  }, {
    key: '_createVertexShader',
    value: function _createVertexShader(gl) {
      var vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, _shadercode.vertexShaderCode);
      gl.compileShader(vertexShader);

      // This should not fail.
      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) throw new Error("\nturbojs: Could not build internal vertex shader (fatal).\n" + "\n" + "INFO: >REPORT< THIS. That's our fault!\n" + "\n" + "--- CODE DUMP ---\n" + _shadercode.vertexShaderCode + "\n\n" + "--- ERROR LOG ---\n" + gl.getShaderInfoLog(vertexShader));
      return vertexShader;
    }
  }, {
    key: '_createFragmentShader',
    value: function _createFragmentShader(gl, code) {
      var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

      gl.shaderSource(fragmentShader, _shadercode.stdlib + code);

      gl.compileShader(fragmentShader);
      // Use this output to debug the shader
      // Keep in mind that WebGL GLSL is **much** stricter than e.g. OpenGL GLSL
      if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        var LOC = code.split('\n');
        var dbgMsg = "ERROR: Could not build shader (fatal).\n\n------------------ KERNEL CODE DUMP ------------------\n";

        for (var nl = 0; nl < LOC.length; nl++) {
          dbgMsg += _shadercode.stdlib.split('\n').length + nl + "> " + LOC[nl] + "\n";
        }dbgMsg += "\n--------------------- ERROR  LOG ---------------------\n" + gl.getShaderInfoLog(fragmentShader);

        throw new Error(dbgMsg);
      }
      return fragmentShader;
    }
  }, {
    key: 'addProgram',
    value: function addProgram(name, code) {
      var gl = this.gl;
      var vertexShader = this.vertexShader;

      var fragmentShader = this._createFragmentShader(this.gl, code);
      var program = gl.createProgram();

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.bindAttribLocation(program, this.attrib.position, 'position');
      gl.bindAttribLocation(program, this.attrib.texture, 'texture');
      gl.linkProgram(program);
      var u_vars = new Map();

      for (var _len = arguments.length, uniforms = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        uniforms[_key - 2] = arguments[_key];
      }

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = uniforms[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var variable = _step.value;

          u_vars.set(variable, gl.getUniformLocation(program, variable));
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      if (!!this.programs.get(name)) {
        console.log("program exists");
      }
      this.programs.set(name, { program: program, u_vars: u_vars });
    }
  }, {
    key: 'use',
    value: function use(name) {}
  }, {
    key: 'run',
    value: function run(name, count) {
      var gl = this.gl;
      var info = this.programs.get(name);
      var program = info.program;
      var u_vars = info.u_vars;
      if (program === null) throw new Error("No Such Program!");

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('turbojs: Failed to link GLSL program code.');

      var uTexture = gl.getUniformLocation(program, 'u_texture');
      gl.useProgram(program);

      count = count || 1;

      for (var _len2 = arguments.length, uniforms = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
        uniforms[_key2 - 2] = arguments[_key2];
      }

      while (count-- > 0) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture0);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(uTexture, 0);

        gl.viewport(0, 0, this.dim.x, this.dim.y);
        _frameBufferSetTexture(gl, this.framebuffer, this.texture1, this.dim); //new
        gl.bindVertexArray(this.vao);
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = uniforms[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var u_v = _step2.value;

            gl.uniform1i(u_vars.get(u_v.n), u_v.v);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        var tex0 = this.texture0;
        this.texture0 = this.texture1;
        this.texture1 = tex0;
      }

      this._finishRun(gl);
    }
  }, {
    key: 'readData',
    value: function readData(x, y, N, M) {
      var gl = this.gl;
      x = x || 0;
      y = y || 0;
      N = N || this.dim.x;
      M = M || this.dim.y;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      gl.readPixels(x, y, N, M, gl.RGBA_INTEGER, gl.INT, this.ipt.data);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return this.ipt.data.subarray(0, this.ipt.length);
    }
  }, {
    key: 'writeData',
    value: function writeData(data) {
      var gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.texture0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32I, this.dim.x, this.dim.y, 0, gl.RGBA_INTEGER, gl.INT, data);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }, {
    key: '_finishRun',
    value: function _finishRun(gl) {
      gl.bindVertexArray(null);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }]);

  return _class;
}();

exports.default = _class;