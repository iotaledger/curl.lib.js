"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = "\nvoid main() {\n  init();\n  ivec4 my_vec = read();\n  if(my_coord.x >= HASH_LENGTH / 3 * 2 && my_coord.x < HASH_LENGTH ) {\n    my_vec.rg = get_sum_to_index(HASH_LENGTH * 2 / 3, HASH_LENGTH, 1, my_coord.y);\n  }\n  if(my_coord.x == STATE_LENGTH ) {\n    my_vec.rg = ivec2(0);\n  }\n  my_vec.ba = my_vec.rg;\n  commit(my_vec);\n}\n";
var add22k = exports.add22k = "\nvoid main() {\n  init();\n  ivec4 my_vec = read();\n  if(my_coord.y == 0) {\n    if(my_coord.x >= HASH_LENGTH / 3 * 2 && my_coord.x < HASH_LENGTH ) {\n      my_vec.rg = get_sum_to_index(HASH_LENGTH * 2 / 3, HASH_LENGTH, 22043, my_coord.y);\n    }\n    my_vec.ba = my_vec.rg;\n  }\n  commit(my_vec);\n}\n";