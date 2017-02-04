import initGL from './initGL'
import newBuffer from './newBuffer'
import createTexture from './texture'
import {vertexShaderCode, stdlib} from './shadercode'

export default class {
  constructor() {
    var gl = initGL();

    // GPU texture buffer from JS typed array
    this.buffers = {
      position : newBuffer(gl, [ -1, -1, 1, -1, 1, 1, -1, 1 ]),
      texture  : newBuffer(gl, [  0,  0, 1,  0, 1, 1,  0, 1 ]),
      index    : newBuffer(gl, [  1,  2, 0,  3, 0, 2 ], Uint16Array, gl.ELEMENT_ARRAY_BUFFER)
    };

    this.vertexShader = this._createVertexShader(gl);
    this.gl = gl;
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
  run (ipt, dim, code, read) {
    let gl = this.gl;
    let vertexShader = this.vertexShader;
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(
      fragmentShader,
      stdlib + code
    );

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

    var program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error('turbojs: Failed to link GLSL program code.');

    var uTexture = gl.getUniformLocation(program, 'u_texture');
    var aPosition = gl.getAttribLocation(program, 'position');
    var aTexture = gl.getAttribLocation(program, 'texture');

    gl.useProgram(program);

    var size = Math.sqrt(ipt.data.length) / 4;
    var texture = createTexture(gl, ipt.data, dim);

    //gl.viewport(0, 0, size, size);
    gl.viewport(0, 0, dim.x, dim.y);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer());

    // Types arrays speed this up tremendously.
    var nTexture = createTexture(gl, new Int32Array(ipt.data.length), dim);
    //var nTexture = createTexture(gl, new Float32Array(ipt.data.length), size);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nTexture, 0);

    // Test for mobile bug MDN->WebGL_best_practices, bullet 7
    var frameBufferStatus = (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE);

    if (!frameBufferStatus)
      throw new Error('turbojs: Error attaching float texture to framebuffer. Your device is probably incompatible. Error info: ' + frameBufferStatus.message);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(uTexture, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texture);
    gl.enableVertexAttribArray(aTexture);
    gl.vertexAttribPointer(aTexture, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    if(read) {
      gl.readPixels(0, 0, dim.x, dim.y, gl.RGBA_INTEGER, gl.INT, ipt.data);
    }
    //gl.readPixels(0, 0, size, size, gl.RGBA, gl.FLOAT, ipt.data);
    return ipt.data.subarray(0, ipt.length);
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
