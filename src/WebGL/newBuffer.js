module.exports = function (gl, data, f, e) {
  var buf = gl.createBuffer();

  gl.bindBuffer((e || gl.ARRAY_BUFFER), buf);
  gl.bufferData((e || gl.ARRAY_BUFFER), new (f || Float32Array)(data), gl.STATIC_DRAW);

  return buf;
}
