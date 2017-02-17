import initGL from './initGL'
import newBuffer from './newBuffer'
import createTexture from './texture'
import {vertexShaderCode, stdlib} from './shadercode'

function _frameBufferSetTexture (gl, fbo, nTexture, dim) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  // Types arrays speed this up tremendously.
  //var nTexture = createTexture(gl, new Int32Array(length), dim);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nTexture, 0);

  // Test for mobile bug MDN->WebGL_best_practices, bullet 7
  var frameBufferStatus = (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE);

  if (!frameBufferStatus)
    throw new Error('turbojs: Error attaching float texture to framebuffer. Your device is probably incompatible. Error info: ' + frameBufferStatus.message);
}
function alloc (sz) {
  // A sane limit for most GPUs out there.
  // JS falls apart before GLSL limits could ever be reached.
  /*
  if (sz > 16777216)
    throw new Error("turbojs: Whoops, the maximum array size is exceeded!");
    */

  var ns = Math.pow(Math.pow(2, Math.ceil(Math.log(sz) / 1.386) - 1), 2);
  return {
    //data : new Int32Array(ns * 16),
    data : new Int32Array(sz),
    length : sz
  };
}
export default class {
  constructor(length, dim) {
    this.gl = initGL();
    let gl = this.gl;
    this.dim = dim;
    this.programs = new Map();
    this.ipt = alloc(length);

    // GPU texture buffer from JS typed array
    this.buffers = {
      position : newBuffer(gl, [ -1, -1, 1, -1, 1, 1, -1, 1 ]),
      texture  : newBuffer(gl, [  0,  0, 1,  0, 1, 1,  0, 1 ]),
      index    : newBuffer(gl, [  1,  2, 0,  3, 0, 2 ], Uint16Array, gl.ELEMENT_ARRAY_BUFFER)
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
    this.texture0 = createTexture(gl, this.ipt.data, this.dim);
    this.texture1 = createTexture(gl, new Int32Array(length), this.dim);
  }
  _bindBuffers(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texture);
    gl.enableVertexAttribArray(this.attrib.texture);
    gl.vertexAttribPointer(this.attrib.texture, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.enableVertexAttribArray(this.attrib.position);
    gl.vertexAttribPointer(this.attrib.position, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
  }
  _createVertexShader(gl) {
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderCode);
    gl.compileShader(vertexShader);

    // This should not fail.
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
      throw new Error(
        "\nturbojs: Could not build internal vertex shader (fatal).\n" + "\n" +
        "INFO: >REPORT< THIS. That's our fault!\n" + "\n" +
        "--- CODE DUMP ---\n" + vertexShaderCode + "\n\n" +
        "--- ERROR LOG ---\n" + gl.getShaderInfoLog(vertexShader)
      );
    return vertexShader;
  }
  _createFragmentShader(gl, code) {
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(fragmentShader, stdlib + code);

    gl.compileShader(fragmentShader);
    // Use this output to debug the shader
    // Keep in mind that WebGL GLSL is **much** stricter than e.g. OpenGL GLSL
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      var LOC = code.split('\n');
      var dbgMsg = "ERROR: Could not build shader (fatal).\n\n------------------ KERNEL CODE DUMP ------------------\n"

      for (var nl = 0; nl < LOC.length; nl++)
        dbgMsg += (stdlib.split('\n').length + nl) + "> " + LOC[nl] + "\n";

      dbgMsg += "\n--------------------- ERROR  LOG ---------------------\n" + gl.getShaderInfoLog(fragmentShader)

      throw new Error(dbgMsg);
    }
    return fragmentShader;
  }
  addProgram (name, code, ...uniforms) {
    let gl = this.gl;
    let vertexShader = this.vertexShader;

    var fragmentShader = this._createFragmentShader(this.gl, code);
    var program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, this.attrib.position, 'position');
    gl.bindAttribLocation(program, this.attrib.texture, 'texture');
    gl.linkProgram(program);
    var u_vars = new Map();
    for(var variable of uniforms) {
      u_vars.set(variable, gl.getUniformLocation(program, variable));
    }
    if(!!this.programs.get(name)) {
      console.log("program exists");
    }
    this.programs.set(name, {program, u_vars});
  }
  use (name) {
  }
  run (name, count, ...uniforms) {
    let gl = this.gl;
    let info = this.programs.get(name);
    let program = info.program;
    let u_vars = info.u_vars;
    if(program === null)
      throw new Error("No Such Program!");

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error('turbojs: Failed to link GLSL program code.');

    var uTexture = gl.getUniformLocation(program, 'u_texture');
    gl.useProgram(program);

    count = count || 1;
    while(count-- > 0) {
      gl.bindTexture(gl.TEXTURE_2D, this.texture0);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(uTexture, 0);

      gl.viewport(0, 0, this.dim.x, this.dim.y);
      _frameBufferSetTexture(gl, this.framebuffer, this.texture1, this.dim); //new
      gl.bindVertexArray(this.vao);
      for(var u_v of uniforms) {
        gl.uniform1i(u_vars.get(u_v.n), u_v.v);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      let tex0 = this.texture0;
      this.texture0 = this.texture1;
      this.texture1 = tex0;
    }

    this._finishRun(gl);
  }

  readData(x,y,N,M) {
    let gl = this.gl;
    x = x || 0;
    y = y || 0;
    N = N || this.dim.x;
    M = M || this.dim.y;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.readPixels(x, y, N, M, gl.RGBA_INTEGER, gl.INT, this.ipt.data);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return this.ipt.data.subarray(0, this.ipt.length);
  }

  writeData(data) {
    let gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32I,this.dim.x,this.dim.y, 0, gl.RGBA_INTEGER, gl.INT, data);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  _finishRun (gl) {
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

}
