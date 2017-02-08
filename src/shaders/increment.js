export default 
`
void main() {
  init();
  ivec4 my_vec = read();
  if(my_coord.x >= HASH_LENGTH / 3 * 2 && my_coord.x < HASH_LENGTH ) {
    my_vec.rg = get_sum_to_index(HASH_LENGTH * 2 / 3, HASH_LENGTH, 1, my_coord.y);
  }
  if(my_coord.x == STATE_LENGTH ) {
    my_vec.rg = ivec2(0);
  }
  my_vec.ba = my_vec.rg;
  commit(my_vec);
}
`
export let add22k = `
void main() {
  init();
  ivec4 my_vec = read();
  if(my_coord.y == 0) {
    if(my_coord.x >= HASH_LENGTH / 3 * 2 && my_coord.x < HASH_LENGTH ) {
      my_vec.rg = get_sum_to_index(HASH_LENGTH * 2 / 3, HASH_LENGTH, 22043, my_coord.y);
    }
    my_vec.ba = my_vec.rg;
  }
  commit(my_vec);
}
`
