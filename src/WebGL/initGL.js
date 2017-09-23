module.exports = function () {
  var canvas = document.createElement('canvas');
  //var canvas = document.getElementById('c');
  var gl = null;
  var attr = {alpha : false, antialias : false};

  // Try to grab the standard context. If it fails, fallback to experimental.
  gl = canvas.getContext("webgl2", attr) || canvas.getContext("experimental-webgl2", attr);

  // If we don't have a GL context, give up now
 if (!gl) { // gl instanceof WebGLRenderingContext)
    throw new Error("Unable to initialize WebGL. Your browser may not support it.");
 }

  return gl;
}
