let twist = `
ivec2 twist() {
  int alpha, beta, gamma, delta;
  ivec4 v1, v2;
  int j = my_coord.x;

  v1 = read_at(ivec2(j == 0? 0:(((j - 1)%2)+1)*HALF_LENGTH - ((j-1)>>1), my_coord.y));
  v2 = read_at(ivec2(((j%2)+1)*HALF_LENGTH - ((j)>>1), my_coord.y));
  alpha = v1.b;
  beta = v1.a;
  gamma = v2.a;
  delta = (alpha | (~gamma)) & (v2.b ^ beta);//v2.b === state_low[t2]

  return ivec2(~delta, (alpha ^ gamma) | delta);
}
`
let  twistMain = `
void main() {
  init();
  ivec4 my_vec = read();
  if(my_coord.x < STATE_LENGTH)
    my_vec.ba = twist();
  commit(my_vec);
}
`

let k_transform = `
void transform() {
  ivec2 scratchpad;
  ivec4 state = read();
  int round;
  for(round = 0; round < NUMBER_OF_ROUNDS; round++) {
    scratchpad = twist();
    //barrier(ivec2(STATE_LENGTH,my_coord.y), 0);
    state.b = scratchpad.s;//sp_low[i];
    state.a = scratchpad.t;//sp_high[i];
    commit(state);
    //barrier(ivec2(STATE_LENGTH,my_coord.y), 0);
  }
}
`

module.exports = twist + twistMain
