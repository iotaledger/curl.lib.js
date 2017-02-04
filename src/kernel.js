export let headers = `#define HASH_LENGTH 243
#define STATE_LENGTH 3 * HASH_LENGTH
#define HALF_LENGTH 364
#define HIGH_BITS 0xFFFFFFFF
#define LOW_BITS 0x00000000
`
export let k_init = `
void main() {
  init();
  ivec4 i = read();
  i.a = my_coord.y;
  if(my_coord.y == 0) {
    commit(i);
  } else {
    commit(read_at(ivec2(my_coord.x,0)));
  }
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
  return to_index;
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
  if(my_coord.x < STATE_LENGTH) {
    int alpha, beta, gamma, delta;
    ivec4 v1, v2;
    int j = my_coord.x;

    v1 = read_at(ivec2(j == 0? 0:(((j - 1)%2)+1)*HALF_LENGTH - ((j-1)>>1), my_coord.y));
    v2 = read_at(ivec2(((j%2)+1)*HALF_LENGTH - ((j)>>1), my_coord.y));
    alpha = v1.b;// state_low[t1];
    beta = v1.a;//state_high[t1];
    gamma = v2.a;//state_high[t2];
    delta = (alpha | (~gamma)) & (v2.b ^ beta);//v2.b === state_low[t2]

    return ivec2(~delta, (alpha ^ gamma) | delta);
  }
  return ivec2(0);
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
  if(my_coord.x < STATE_LENGTH) {
    ivec2 tw = twist();
    barrier(ivec2(STATE_LENGTH,my_coord.y), 0);
    commit(ivec4(read().rg,tw));
  } else {
    commit(read());
  }
}
`
export let k_check = `
void main() {
  init();
  ivec4 my_vec = read();
  if(my_coord.x == STATE_LENGTH) {
    ivec2 r_texel;
    int mwm = my_vec.a;
    my_vec.a = HIGH_BITS;
    int i;
    for (i = mwm; i-- > 0; ) {
      r_texel = read_at(ivec2(HASH_LENGTH - 1 - i, my_coord.y)).ba;
      my_vec.a &= ~(r_texel.s ^ r_texel.t);
      if (my_vec.a == 0) {
        break;
      }
    }
    //commit(ivec4(my_coord.xy,r_texel.s,my_vec.a));
    my_vec.b = my_coord.x;
    commit(my_vec);
  } else {
    my_vec.b = my_coord.x;
    commit(my_vec);
  }
}
`

let oldstuff = {
  headers: `#define HASH_LENGTH 243
  #define STATE_LENGTH 3 * HASH_LENGTH
  #define HALF_LENGTH 364
  /*
  #define HIGH_BITS 0xFFFFFFFFFFFFFFFF
  #define LOW_BITS 0x0000000000000000
  */
  #define HIGH_BITS 0xFFFFFFFF
  #define LOW_BITS 0x00000000
  `,
  coord_at: `
  vec2 coord_at(vec2 desired_pos) {
    vec2 size = floor(gl_FragCoord.xy / pos.xy);
    return desired_pos / size;
  }
  `,
  init: `
  void main() {
    commit(gl_FragCoord.y == 0.5 ? read() : readAt(coord_at(vec2(gl_FragCoord.x,0.5))));
  }
  `,
  offset: `
  void main() {
    int p = int(gl_FragCoord.y);
    vec4 my_vec = read();
    int watcher_index = 729;
    int start = HASH_LENGTH / 3;
    int end = (HASH_LENGTH/3)*2;
    if(p >= start  && !(p > end && p < watcher_index)) {
      for(int i = 0; i < p; i++) {
        if(p == watcher_index) {
          my_vec.r = float(get_increment_depth(start, end));
          commit(my_vec);
        }
        block(HASH_LENGTH/3, 2 * (HASH_LENGTH/3), 729, p);
        if(p >= HASH_LENGTH/3 && p <= 2 * (HASH_LENGTH/3)) {
          increment(float(HASH_LENGTH / 3), float(readAt(coord_at(vec2(729.5, gl_FragCoord.y))).r));
        }
      }
    }
  }
  int get_increment_depth(const int from_index,const int to_index) {
    //for(int i= from_index; i < to_index; i++) {
    for(int i= 0; i < 81; i++) {
      //if (readAt(vec2(i,gl_FragCoord.y)).r != float(LOW_BITS)) {
      if (readAt(coord_at(vec2(float(i+from_index)+0.5,gl_FragCoord.y))).r != float(LOW_BITS)) {
        return i;
      }
    }
    return to_index;
  }
  void increment(float from_index, float last_index) {
    vec4 my_vec = read();
    if(gl_FragCoord.x <= last_index && gl_FragCoord.x >= from_index) {
      if(gl_FragCoord.x == last_index) {
        if (my_vec.g == float(LOW_BITS)) {
          my_vec.g = float(HIGH_BITS);
        } else {
          my_vec.r = float(LOW_BITS);
        }
      } else {
        my_vec.r = float(HIGH_BITS);
        my_vec.g = float(LOW_BITS);
      }
    }
    commit(my_vec);
  }`,
  increment: `void main() {
    vec4 my_vec = read();
    //for(float i = 0.5 + float(HASH_LENGTH / 3 *2); i < float(HASH_LENGTH)+0.5; i++) {
    if(gl_FragCoord.y > 9.5 || gl_FragCoord.y < 6.5) return;
    for(float i = 6.5; i < 9.5; i++) {
      for(float j = 0.5; j < 27.5; j++) {
        if(i > gl_FragCoord.y || (j > gl_FragCoord.x && i == gl_FragCoord.y)) {
          break; //I don't care what follows me
        }
        if(readAt(coord_at(vec2(j,i))).r == float(LOW_BITS)) {
          if(i == gl_FragCoord.y && j == gl_FragCoord.x) {
            my_vec.r = float(HIGH_BITS);
            my_vec.g = float(LOW_BITS);
          }
        } else {
          if(i == gl_FragCoord.y && j == gl_FragCoord.x) {
            if (my_vec.g == float(LOW_BITS)) {
              my_vec.g = float(HIGH_BITS);
            } else {
              my_vec.r = float(LOW_BITS);
            }
          }
          break;
        }
      }
    }
    my_vec.b = my_vec.r;
    my_vec.a = my_vec.g;
    commit(my_vec);
  }`,
  transform: ` void main() {
    int alpha, beta, gamma, delta;
    int index, t1, t2;
    vec4 v1,v2;

    if(gl_FragCoord.y < 27.5) return;

    index = int(floor(gl_FragCoord.x + 27.0 * (gl_FragCoord.y - 26.5)));
    t1  = index == 0? 0:(index - ((index-1)/2)*2)*HALF_LENGTH - ((index-1)/2);
    t2 = (index - (index/2)*2 +1)*HALF_LENGTH - index/2;

    v1 = readAt(coord_at(vec2(float(t1 - (t1/27)*27)+ 0.5, float(t1 - (t1/27)*27) + 0.5)));
    v2 = readAt(coord_at(vec2(float(t2 - (t2/27)*27)+ 0.5, float(t2 - (t2/27)*27) + 0.5)));

    /*
    alpha = int(v1.b);
    beta = int(v1.a);
    gamma = int(v2.a);
    delta = (alpha | (~gamma)) & (int(v2.b) ^ beta);
    commit(vec4(0,0,float(~delta), float((alpha ^ gamma) | delta)));
    */
  }
  `,
  check: `void check(
    state_low,
    state_high,

    stant size_t *min_weight_magnitude,

    size_t gr_id
  ) {
    *nonce_probe = float(HIGH_BITS);
    for (int i = HASH_LENGTH - *min_weight_magnitude; i < HASH_LENGTH; i++) {
      *nonce_probe &= ~(state_low[i] ^ state_high[i]);
      if(*nonce_probe == 0) return;
    }
    if(*nonce_probe != 0) {
      *found = gr_id + 1;
    }

  }`,
  search: (mwm) => `void main() {
    if(id == 0) increment(&(mid_low[gid]), &(mid_high[gid]), (HASH_LENGTH/3)*2, HASH_LENGTH);

    barrier(CLK_LOCAL_MEM_FENCE);
    copy_mid_to_state(&(mid_low[gid]), &(mid_high[gid]), &(state_low[gid]), &(state_high[gid]), id, l_size, n_trits);

    barrier(CLK_LOCAL_MEM_FENCE);
    transform(&(state_low[gid]), &(state_high[gid]), id, l_size, n_trits);

    barrier(CLK_LOCAL_MEM_FENCE);
    if(id == 0) check(&(state_low[gid]), &(state_high[gid]), found, ${mwm}., &(nonce_probe[gr_id]), gr_id);

    barrier(CLK_LOCAL_MEM_FENCE);
    if(*found != 0) break;
  }`,
  finalize : `void main(
    trit_t *trit_hash,
    trit_t *mid_low,
    trit_t *mid_high,


  ) {
    size_t i,j, id, gid, gr_id, l_size, n_trits;
    setup_ids(&id, &gid, &gr_id, &l_size, &n_trits);

    if(gr_id == (size_t)(*found - 1) && nonce_probe[gr_id] != 0) {
      for(i = 0; i < n_trits; i++) {
        j = id + i*l_size;
        if(j < HASH_LENGTH) {
          trit_hash[j] = (mid_low[gid + j] & nonce_probe[gr_id]) == 0 ? 
            1 : (mid_high[gid + j] & nonce_probe[gr_id]) == 0 ? -1 : 0;
        }
      }
    }
  }`
}
//commit(vec4(mypos, my_vec.rg));
//commit(vec4(readAt(coord_at(vec2(0,1.5))).xy, floor(vec2(730.0, 730.0/2.0)* pos )));
/*
vec2 mypos = coord_at(vec2(0,1));
vec4 elsewhere = readAt(mypos);
commit(vec4(elsewhere.gb, floor(vec2(730.0, 730.0/2.0)* mypos )));
*/
//commit(vec4(coords.xy, gl_FragCoord.xy/pos));
//commit(vec4(my_vec.r - 1.0, my_vec.g - 2.0, my_vec.b - 3.0, my_vec.a - 4.0));
//commit(a_position);
//if(coords.y > 0.0) {
//vec4 base = readAt(vec2(pos.x,pos.y));
//commit(vec4(elsewhere.gb, floor(vec2(730.0, 730.0/2.0)* mypos )));
//my_vec.r = base.r; //mid_low
//my_vec.g = base.g; //mid_high

//commit(my_vec);
/*
    trit_t *mid_low,
    trit_t *mid_high,
    size_t from_index,
    size_t to_index
    */
/*
        int i = 0;
        do {
          i += readAt(vec2(float)i+.5,gl_FragCoord.y)).b == float)1? 1 : 0;
        } while(i < 730);
        my_vec.r = i+1 < p ? HASH_LENGTH / 3 : 0;
        my_vec.g = 1;
        commit(my_vec);
      } else {
        do {} while (readAt(vec2(729.5, gl_FragCoord.y)).r == 0.0);
        my_vec.b = 1.0;
        commit(my_vec);
        do {} while (readAt(vec2(729.5, gl_FragCoord.y)).g == 0.0);
      }
      */
/*
        float p = floor(coords.y);
        for(float i = 0.0; i < p; i++) {
//increment(&(mid_low[gid]), &(mid_high[gid]), HASH_LENGTH / 3, (HASH_LENGTH / 3) * 2);
        }
        */

/*
  block: `
  void watch(int start, int end, float val, float newval) {
    vec4 my_vec = read();
    int sweep = start;
    while(sweep < end) {
      if(readAt(coord_at(vec2(float(sweep)+0.5, gl_FragCoord.y))).a == val) sweep++;
    }
    my_vec.a = newval;
    commit(my_vec);
  }
  void wait(int watcher_index, float val, float setval) {
    vec4 my_vec = read();
    my_vec.a = setval;
    commit(my_vec);
    while (readAt(coord_at((vec2(float(watcher_index) + 0.5, gl_FragCoord.y)))).a == val) { }
  }
  void block(int start, int end, int watcher_index, int index) {
    vec4 my_vec = read();
    if(index == watcher_index) {
      watch(start, end, 1.5, 1.5);
      watch(start, end, 0.5, 0.5);
    } else if (index >= start && index <= end) {
      wait(watcher_index, 1.5, 1.5);
      my_vec.a = 0.5;
      commit(my_vec);
    }
  }
  `,
  */
/*
  void transform(
    state_low,
    state_high,
    size_t id,
    size_t l_size,
    size_t n_trits
  ) {
    size_t round, i, j, t1, t2;
    trit_t sp_low[3], sp_high[3];
    for(round = 0; round < 27; round++) {
      for(i = 0; i < n_trits; i++) {
        j = id + i*l_size;
        t1 = j == 0? 0:(((j - 1)%2)+1)*HALF_LENGTH - ((j-1)>>1);
        t2 = ((j%2)+1)*HALF_LENGTH - ((j)>>1);

        alpha = state_low[t1];
        beta = state_high[t1];
        gamma = state_high[t2];
        delta = (alpha | (~gamma)) & (state_low[t2] ^ beta);

        sp_low[i] = ~delta;
        sp_high[i] = (alpha ^ gamma) | delta;
      }
      barrier(CLK_LOCAL_MEM_FENCE);
      for(i = 0; i < n_trits; i++) {
        j = id + i*l_size;
        state_low[j] = sp_low[i];
        state_high[j] = sp_high[i];
      }
      barrier(CLK_LOCAL_MEM_FENCE);
    }
  }*/

