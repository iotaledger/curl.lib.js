module.exports = { do_check: `
int check(int row, int min_weight_magnitude) {
  int nonce_probe, i;
  ivec2 r_texel;
  nonce_probe = HIGH_BITS;
  for(i = min_weight_magnitude; i-- > 0; ) {
    r_texel = read_at(ivec2(HASH_LENGTH - 1 - i, row)).ba;
    nonce_probe &= ~(r_texel.s ^ r_texel.t);
    if(nonce_probe == 0) break;
  }
  return nonce_probe;
}
`, k_check: `
uniform int minWeightMagnitude;
void main() {
  init();
  ivec4 my_vec = read();
  if(my_coord.x == STATE_LENGTH) {
    my_vec.r = minWeightMagnitude;
    my_vec.a = check(my_coord.y, minWeightMagnitude);
  }
  commit(my_vec);
}
`, col: `
void main() {
  init();
  ivec4 my_vec = read();
  int i;
  if(my_coord.x == STATE_LENGTH && my_coord.y == 0) {
    my_vec.b = 0;
    if(my_vec.a == 0) {
      ivec4 read_vec;
      my_vec.b = -1;
      for(i = 1; i < int(size.y); i++) {
        read_vec = read_at( ivec2( STATE_LENGTH, i));
        if(read_vec.a != 0) {
          my_vec.a = read_vec.a;
          my_vec.b = i;
          break;
        }
      }
    }
  }
  commit(my_vec);
}
`
}
