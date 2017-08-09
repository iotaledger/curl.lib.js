"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var vertexShaderCode = exports.vertexShaderCode = "#version 300 es\nlayout(location = 0) in vec2 position;\nlayout(location = 1) in vec2 texture;\nout vec2 pos;\n\nvoid main(void) {\n  pos = texture;\n  gl_Position = vec4(position.xy, 0.0, 1.0);\n}",
    stdlib = exports.stdlib = "#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp isampler2D;\nuniform isampler2D u_texture;\nin vec2 pos;\nout ivec4 color;\n//out int isFinished;\n\nvec2 size;\nivec2 my_coord;\n\nvoid init(void) {\n  //size = vec2(textureSize(u_texture, 0) - 1);\n  size = vec2(textureSize(u_texture, 0));\n  my_coord = ivec2(pos * size);\n}\n\nivec4 read(void) {\n  return texture(u_texture, pos);\n}\n\nivec4 read_at(ivec2 coord) {\n  return texelFetch(u_texture, coord, 0);\n}\n\nvoid commit(ivec4 val) {\n  color = val;\n}\n";