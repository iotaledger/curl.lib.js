export let headers = `#define HASH_LENGTH 243
#define STATE_LENGTH 3 * HASH_LENGTH
#define HALF_LENGTH 364
#define HIGH_BITS 0xFFFFFFFF
#define LOW_BITS 0x00000000
`
export let copy = `
void main() {
  init();
  ivec4 i = read();
  i.ba = i.rg;
  commit(i);
}
`
export let finalize = `
void main() {
  init();
  ivec4 my_vec = read();
  if(my_coord.y == 0 && my_coord.x < HASH_LENGTH) {
    ivec4 info_vec = read_at(ivec2(STATE_LENGTH, 0));
    ivec4 hash_vec = read_at(ivec2(my_coord.x, info_vec.b));
    my_vec.a = (hash_vec.r & info_vec.a) == 0? 1 : ((hash_vec.g & info_vec.a) == 0? -1 : 0);
  }
  commit(my_vec);
}
`
export let increment_depth = `
int get_increment_depth(int from_index, int to_index) {
  ivec4 i_coord;
  for(int i= from_index; i < to_index; i++) {
    i_coord = read_at(ivec2(from_index, my_coord.y));
    if(i_coord.r != LOW_BITS)
      return i;
  }
}
`
export let increment_one = `
void main() {
  init();
}
`
export let barrier = `
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
    /*
    if(high == 0)
      my_vec.r = hold;
    else
      my_vec.a = hold;
      */
  }
  commit(my_vec);
}
`
export let twist = `
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
export let k_transform = `
void transform() {
  ivec2 scratchpad;
  ivec4 state = read();
  int round;
  for(round = 0; round < 27; round++) {
    scratchpad = twist();
    barrier(ivec2(STATE_LENGTH,my_coord.y), 0);
    state.b = scratchpad.s;//sp_low[i];
    state.a = scratchpad.t;//sp_high[i];
    commit(state);
    barrier(ivec2(STATE_LENGTH,my_coord.y), 0);
  }
}
`
export let  twistMain = `
void main() {
  init();
  ivec4 my_vec = read();
  if(my_coord.x < STATE_LENGTH)
    my_vec.ba = twist();
  commit(my_vec);
}
`
export let k_check = `
uniform int minWeightMagnitude;
void main() {
  init();
  ivec4 my_vec = read();
  if(my_coord.x == STATE_LENGTH) {
    ivec2 r_texel;
    my_vec.a = HIGH_BITS;
    int i;
    for (i = minWeightMagnitude; i-- > 0; ) {
      r_texel = read_at(ivec2(STATE_LENGTH - 1 - i, my_coord.y)).ba;
      my_vec.a &= ~(r_texel.s ^ r_texel.t);
      if (my_vec.a == 0) {
        break;
      }
    }
  }
  commit(my_vec);
}
`
export let k_col_check = `
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
export let add = `
int sum (int a, int b) {
  int my_sum = a + b;
  return my_sum == 2 ? -1 : (my_sum == -2) ? 1 : my_sum;
}
int cons (int a, int b) {
  return (a == 1 && b == 1)? 1 : (a == -1 && b == -1) ? -1 : 0;
}
int any_t (int a, int b) {
  int my_any = a + b;
  return my_any == 0 ? 0 : (my_any > 0) ? 1 : -1;
}
ivec2 full_adder(int a, int b, int c) {
  int c_a, c_b, sum_ab, c_s;

  c_a    = cons(a,b);
  sum_ab = sum(a,b);
  c_b    = cons(sum_ab,c);
  c_s    = any_t(c_a, c_b);

  return ivec2(sum(sum_ab, c), c_s);
}
ivec2 get_sum_to_index(int from, int to, int number_to_add, int row) {
  int trit_to_add, trit_at_index, pow, carry, num_carry;
  ivec2 read_in, sum_out, out_trit;
  pow = 1;
  carry = 0;
  num_carry = 0;

  for(int i = from; i < to; i++) {
    //if(trit_to_add == 0 && sum_out.t == 0) continue;

    read_in = read_at ( ivec2 (i, row)).rg;

    trit_to_add = ((number_to_add / pow) % 3) + num_carry;
    num_carry = trit_to_add > 1 ? 1 : 0;
    trit_to_add = (trit_to_add == 2 ? -1 : (trit_to_add == 3 ? 0 : trit_to_add));

    sum_out = full_adder(
      (read_in.s == LOW_BITS ? 1 : read_in.t == LOW_BITS? -1 : 0), 
      trit_to_add, 
      carry
    );

    if(my_coord.x == i) break;
    carry = sum_out.t;
    pow *=3;
  }
  if(sum_out.s == 0) {
    return ivec2(HIGH_BITS);
  } else if (sum_out.s == 1) {
    return ivec2(LOW_BITS, HIGH_BITS);
  } else {
    return ivec2(HIGH_BITS, LOW_BITS);
  }
}
`
export let offset = `
ivec4 offset() {
  if(my_coord.x >= HASH_LENGTH / 3 && my_coord.x < HASH_LENGTH / 3 * 2 ) {
    ivec4 my_vec;
    my_vec.rg = get_sum_to_index(HASH_LENGTH / 3, HASH_LENGTH / 3 * 2, my_coord.y, 0);
    return my_vec;
  } else {
    return read_at(ivec2(my_coord.x,0));
  }
}
`
export let k_init = `
void main() {
  init();
  if(my_coord.y == 0) {
    commit(read());
  } else {
    commit(offset());
  }
}
`
export let increment = `
void main() {
  init();
  ivec4 my_vec = read();
  if(my_coord.x >= HASH_LENGTH / 3 * 2 && my_coord.x < HASH_LENGTH ) {
    my_vec.rg = get_sum_to_index(HASH_LENGTH * 2 / 3, HASH_LENGTH, 1, my_coord.y);
  }
  my_vec.ba = my_vec.rg;
  commit(my_vec);
}
`
