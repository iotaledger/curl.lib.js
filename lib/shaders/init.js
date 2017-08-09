"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var k_init = "\nvoid main() {\n  init();\n  commit(offset());\n}\n";
var offset = "\nuniform int gr_offset;\nivec4 offset() {\n  if(my_coord.x >= HASH_LENGTH / 3 && my_coord.x < HASH_LENGTH / 3 * 2 ) {\n    ivec4 my_vec;\n    my_vec.rg = get_sum_to_index(HASH_LENGTH / 3, HASH_LENGTH / 3 * 2, my_coord.y + gr_offset, 0);\n    return my_vec;\n  } else {\n    return read_at(ivec2(my_coord.x,0));\n  }\n}\n";
exports.default = offset + k_init;