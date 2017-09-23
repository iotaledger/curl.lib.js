const initGL = require('./initGL');
const newBuffer = require('./newBuffer');
const createTexture = require('./texture');
const ShaderCode = require('./shadercode');

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

  var ns = Math.pow(Math.pow(2, Math.ceil(Math.log(sz) / 1.386) - 1), 2);
  return {
    //data : new Int32Array(ns * 16),
    data : new Int32Array(sz),
    length : sz
  };
}
const _bindBuffers = (gl, buffers, attrib) => {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texture);
  gl.enableVertexAttribArray(attrib.texture);
  gl.vertexAttribPointer(attrib.texture, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.enableVertexAttribArray(attrib.position);
  gl.vertexAttribPointer(attrib.position, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
}
const _createVertexShader = (gl) => {
  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, ShaderCode.vertexShaderCode);
  gl.compileShader(vertexShader);

  // This should not fail.
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
    throw new Error(
      "\nturbojs: Could not build internal vertex shader (fatal).\n" + "\n" +
      "INFO: >REPORT< THIS. That's our fault!\n" + "\n" +
      "--- CODE DUMP ---\n" + ShaderCode.vertexShaderCode + "\n\n" +
      "--- ERROR LOG ---\n" + gl.getShaderInfoLog(vertexShader)
    );
  return vertexShader;
}
const _createFragmentShader = (gl, code) => {
  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(fragmentShader, ShaderCode.stdlib + code);

  gl.compileShader(fragmentShader);
  // Use this output to debug the shader
  // Keep in mind that WebGL GLSL is **much** stricter than e.g. OpenGL GLSL
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    var LOC = code.split('\n');
    var dbgMsg = "ERROR: Could not build shader (fatal).\n\n------------------ KERNEL CODE DUMP ------------------\n"

    for (var nl = 0; nl < LOC.length; nl++)
      dbgMsg += (ShaderCode.stdlib.split('\n').length + nl) + "> " + LOC[nl] + "\n";

    dbgMsg += "\n--------------------- ERROR  LOG ---------------------\n" + gl.getShaderInfoLog(fragmentShader)

    throw new Error(dbgMsg);
  }
  return fragmentShader;
}
const _finishRun  = (gl) => {
  gl.bindVertexArray(null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
const WebGLWorker = (l, s) => {

  let worker = new Object();
  worker.gl = initGL();
  let gl = worker.gl;

  worker.dim = {
    x: l,
    y: 0
  };
  const MAXIMAGESIZE = Math.pow(gl.MAX_TEXTURE_SIZE, 2) * 0.50;
  const IMAGE_SIZE= Math.floor(MAXIMAGESIZE / worker.dim.x / s ) * worker.dim.x * s;
  worker.dim.y = IMAGE_SIZE / worker.dim.x / s ;
  let length = IMAGE_SIZE;


  worker.programs = new Map();
  worker.ipt = alloc(length);

  // GPU texture buffer = from JS typed array
  worker.buffers = {
    position : newBuffer(gl, [ -1, -1, 1, -1, 1, 1, -1, 1 ]),
    texture  : newBuffer(gl, [  0,  0, 1,  0, 1, 1,  0, 1 ]),
    index    : newBuffer(gl, [  1,  2, 0,  3, 0, 2 ], Uint16Array, gl.ELEMENT_ARRAY_BUFFER)
  };

  worker.attrib = {
    position: 0,
    texture: 1
  };

  worker.vao = gl.createVertexArray();
  gl.bindVertexArray(worker.vao);
  _bindBuffers(gl, worker.buffers, worker.attrib);
  gl.bindVertexArray(null);
  worker.vertexShader = _createVertexShader(gl);
  worker.framebuffer = gl.createFramebuffer();
  worker.texture0 = createTexture(gl, worker.ipt.data, worker.dim);
  worker.texture1 = createTexture(gl, new Int32Array(length), worker.dim);
  return worker;
}
module.exports = {
  worker: WebGLWorker,
  addProgram: (worker, name, code, ...uniforms) => {
    let gl = worker.gl;
    let vertexShader = worker.vertexShader;

    var fragmentShader = _createFragmentShader(worker.gl, code);
    var program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, worker.attrib.position, 'position');
    gl.bindAttribLocation(program, worker.attrib.texture, 'texture');
    gl.linkProgram(program);
    var u_vars = new Map();
    for(var variable of uniforms) {
      u_vars.set(variable, gl.getUniformLocation(program, variable));
    }
    if(!!worker.programs.get(name)) {
      console.log("program exists");
    }
    worker.programs.set(name, {program, u_vars});
  },
    /*
    use: (name) => {
  },
  */
  run: (worker, name, count, ...uniforms) => {
    let gl = worker.gl;
    let info = worker.programs.get(name);
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
      gl.bindTexture(gl.TEXTURE_2D, worker.texture0);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(uTexture, 0);

      gl.viewport(0, 0, worker.dim.x, worker.dim.y);
      _frameBufferSetTexture(gl, worker.framebuffer, worker.texture1, worker.dim); //new
      gl.bindVertexArray(worker.vao);
      for(var u_v of uniforms) {
        gl.uniform1i(u_vars.get(u_v.n), u_v.v);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      let tex0 = worker.texture0;
      worker.texture0 = worker.texture1;
      worker.texture1 = tex0;
    }

    _finishRun(gl);
  },
  readData: (worker, x,y,N,M) => {
    let gl = worker.gl;
    x = x || 0;
    y = y || 0;
    N = N || worker.dim.x;
    M = M || worker.dim.y;
    gl.bindFramebuffer(gl.FRAMEBUFFER, worker.framebuffer);
    gl.readPixels(x, y, N, M, gl.RGBA_INTEGER, gl.INT, worker.ipt.data);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return worker.ipt.data.subarray(0, worker.ipt.length);
  },
  writeData: (worker, data) => {
    let gl = worker.gl;
    gl.bindTexture(gl.TEXTURE_2D, worker.texture0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32I,worker.dim.x,worker.dim.y, 0, gl.RGBA_INTEGER, gl.INT, data);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}
