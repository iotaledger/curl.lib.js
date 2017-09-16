module.exports = `
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
