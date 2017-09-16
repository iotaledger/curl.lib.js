module.exports = `
void main() {
  init();
  ivec4 my_vec = read();
  if(my_coord.x >= INCREMENT_START && my_coord.x < HASH_LENGTH ) {
    my_vec.rg = get_sum_to_index(INCREMENT_START, HASH_LENGTH, 1, my_coord.y);
  }
  if(my_coord.x == STATE_LENGTH ) {
    my_vec.rg = ivec2(0);
  }
  my_vec.ba = my_vec.rg;
  commit(my_vec);
}
`
