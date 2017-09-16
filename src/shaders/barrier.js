module.exports = `
// Choose high != 0 if you want to barrier rg values, 0 if you want to barrier ba
#define WAITNUM 2
void barrier(ivec2 watch_coords, int high) {
  ivec4 my_vec = read();
  if(watch_coords == my_coord) {
    int hold_index = 0;
    ivec4 hold_texel;
    my_vec.g = my_vec.a + 1;
    my_vec.b = my_vec.g + 1;
    commit(my_vec);
    while(hold_index < STATE_LENGTH) {
      hold_texel = read_at(ivec2(hold_index, my_coord.y));
      if((high == 0 && hold_texel.r == WAITNUM) ||(high != 0 && hold_texel.a == WAITNUM))
        hold_index++;
    }
    my_vec.a = my_vec.g;
    //my_vec.a = 123;
  } else {
    ivec4 watch = read_at(watch_coords); // r: val to watch, g: expected val, b: next val (should be 1+ expected val)
    int hold = high == 0 ? my_vec.r : my_vec.a;
    if(high == 0)
      my_vec.r = WAITNUM;
    else
      my_vec.a = WAITNUM;
    commit(my_vec);
    while(watch.g == watch.b || watch.a != watch.g) {
      //while(watch.g == watch.b || watch.a != 123) {
      watch = read_at(watch_coords);
    }
  }
  commit(my_vec);
}
`
