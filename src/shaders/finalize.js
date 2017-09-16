module.exports = `
void main() {
  init();
  ivec4 my_vec = read();
  if(my_coord.y == 0 && my_coord.x == STATE_LENGTH) {
    my_vec.g = check(my_vec.b, my_vec.r);
  }
  if(my_coord.y == 0 && my_coord.x < HASH_LENGTH) {
    ivec4 info_vec = read_at(ivec2(STATE_LENGTH, 0));
    int nonce_probe = info_vec.a;
    int row = info_vec.b;
    ivec4 hash_vec = read_at(ivec2(my_coord.x, row));
    my_vec.a = (hash_vec.r & nonce_probe) == 0? 1 : ((hash_vec.g & nonce_probe) == 0? -1 : 0);
  }
  commit(my_vec);
}
`
