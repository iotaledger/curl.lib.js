// Transfer data onto clamped texture and turn off any filtering
module.exports = function createTexture(gl, data, dim) {
  var texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32I, dim.x, dim.y, 0, gl.RGBA_INTEGER, gl.INT, data);
  //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size, size, 0, gl.RGBA, gl.FLOAT, data);
  //gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, size, size);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}
