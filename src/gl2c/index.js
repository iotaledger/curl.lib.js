import initGL from './initGL'
import newBuffer from './newBuffer'
import createTexture from './texture'
import {vertexShaderCode, stdlib} from './shadercode'

  function _frameBufferSetup (gl, fbo, length, dim) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    // Types arrays speed this up tremendously.
    var nTexture = createTexture(gl, new Int32Array(length), dim);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nTexture, 0);

    // Test for mobile bug MDN->WebGL_best_practices, bullet 7
    var frameBufferStatus = (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE);

    if (!frameBufferStatus)
      throw new Error('turbojs: Error attaching float texture to framebuffer. Your device is probably incompatible. Error info: ' + frameBufferStatus.message);
  }
export default class {
  constructor(length, dim) {
    this.gl = initGL();
    let gl = this.gl;
    this.dim = dim;
    this.programs = new Map();

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
    _frameBufferSetup(gl, this.framebuffer, length, this.dim);
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
  addProgram (name, code) {
    let gl = this.gl;
    let vertexShader = this.vertexShader;

    var fragmentShader = this._createFragmentShader(this.gl, code);
    var program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, this.attrib.position, 'position');
    gl.bindAttribLocation(program, this.attrib.texture, 'texture');
    gl.linkProgram(program);
    if(!!this.programs.get(name)) {
      console.log("program exists");
    }
    this.programs.set(name, program);
  }
  use (name) {
  }
  run (ipt, name) {
    let gl = this.gl;
    let program = this.programs.get(name);
    if(program === null)
      throw new Error("No Such Program!");

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error('turbojs: Failed to link GLSL program code.');

    var uTexture = gl.getUniformLocation(program, 'u_texture');
    gl.useProgram(program);

    var texture = createTexture(gl, ipt.data, this.dim);

    gl.viewport(0, 0, this.dim.x, this.dim.y);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(this.vao);
    gl.uniform1i(uTexture, 0);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.readPixels(0, 0, this.dim.x, this.dim.y, gl.RGBA_INTEGER, gl.INT, ipt.data);

    gl.deleteTexture(texture);
    this._finishRun(gl);
    return ipt.data.subarray(0, ipt.length);
  }

  _finishRun (gl) {
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  static alloc (sz) {
    // A sane limit for most GPUs out there.
    // JS falls apart before GLSL limits could ever be reached.
    if (sz > 16777216)
      throw new Error("turbojs: Whoops, the maximum array size is exceeded!");

    var ns = Math.pow(Math.pow(2, Math.ceil(Math.log(sz) / 1.386) - 1), 2);
    return {
      data : new Int32Array(ns * 16),
      //data : new Float32Array(ns * 16),
      length : sz
    };
  }
}
