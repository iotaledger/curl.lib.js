let HASH_LENGTH = 243,
  TRYTE_LENGTH = 2673,
  STATE_LENGTH= 3 * HASH_LENGTH,
  TRANSACTION_LENGTH= TRYTE_LENGTH * 3,
  LOW_BITS= 0x00000000,//00000000,
  HIGH_BITS= ~LOW_BITS,//0xFFFFFFFF,//0xFFFFFFFF,//FFFFFFFF,4294967295, 
  LOW_0= 0xDB6DB6DB,//6DB6DB6D,
  HIGH_0= 0xB6DB6DB6,//DB6DB6DB,
  LOW_1= 0xF1F8FC7E,//3F1F8FC7,
  HIGH_1= 0x8FC7E3F1,//F8FC7E3F,
  LOW_2= 0x7FFFE00F,//FFFC01FF,
  HIGH_2= 0xFFC01FFF,//F803FFFF,
  LOW_3= 0xFFC00000,//07FFFFFF,
  HIGH_3= 0x003FFFFF; //FFFFFFFF,
/*
  HIGH_BITS= 0xFFFFFFFFFFFFFFFF,
  LOW_BITS= 0x0000000000000000,
  LOW_0= 0xDB6DB6DB6DB6DB6D,
  HIGH_0= 0xB6DB6DB6DB6DB6DB,
  LOW_1= 0xF1F8FC7E3F1F8FC7,
  HIGH_1= 0x8FC7E3F1F8FC7E3F,
  LOW_2= 0x7FFFE00FFFFC01FF,
  HIGH_2= 0xFFC01FFFF803FFFF,
  LOW_3= 0xFFC0000007FFFFFF,
  HIGH_3= 0x003FFFFFFFFFFFFF;
  */


function setOffset(states) {
  states.low[0] = LOW_0;
  states.high[0] = HIGH_0;
  states.low[1] = LOW_1;
  states.high[1] = HIGH_1;
  states.low[2] = LOW_2;
  states.high[2] = HIGH_2;
  states.low[3] = LOW_3;
  states.high[3] = HIGH_3;
}

export function transform(states) {
  var scratchpadHigh, scratchpadLow
  var scratchpadIndex = 0, round, stateIndex;
  var alpha, beta, gamma, delta;

  for (round = 27; round-- > 0; ) {
    scratchpadLow = states.low.slice();
    scratchpadHigh = states.high.slice();

    for (stateIndex = 0; stateIndex < STATE_LENGTH; stateIndex++) {
      alpha = scratchpadLow[scratchpadIndex];
      beta = scratchpadHigh[scratchpadIndex];
      gamma = scratchpadHigh[scratchpadIndex += (scratchpadIndex < 365 ? 364 : -365)];
      delta = (alpha | (~gamma)) & (scratchpadLow[scratchpadIndex] ^ beta);

      states.low[stateIndex] = ~delta;
      states.high[stateIndex] = (alpha ^ gamma) | delta;
    }
  }
}

function copyTransactionToStates(states, transactionTrits, offset) {
  var j;
  for (var j = 0; j < HASH_LENGTH; j++) {
    switch (transactionTrits[offset++]) {
      case 0: {
        states.low[j] = HIGH_BITS;
        states.high[j] = HIGH_BITS;
      } break;
      case 1: {
        states.low[j] = LOW_BITS;
        states.high[j] = HIGH_BITS;
      } break;
      default: {
        states.low[j] = HIGH_BITS;
        states.high[j] = LOW_BITS;
      }
    }
  }
  return offset;
}
export default function /*searchInit*/(states, transactionTrits) {
  var i, offset = 0;
  for (i = (TRANSACTION_LENGTH - HASH_LENGTH) / HASH_LENGTH; i-- > 0; ) {
    offset = copyTransactionToStates(states, transactionTrits, offset);
    if(i == 1) break;
    transform(states);
  }
  setOffset(states);
}
  /*
  var j;
  //for (i = HASH_LENGTH; i < STATE_LENGTH; i++) {
  for (i = 0; i < STATE_LENGTH; i++) {
    if (i >= HASH_LENGTH && i < STATE_LENGTH) {
      states.low[i] = HIGH_BITS;
      states.high[i] = HIGH_BITS;
    } else {
      states.low[i] = 0;
      states.high[i] = 0;
    }
  }

  for (i = (TRANSACTION_LENGTH - HASH_LENGTH) / HASH_LENGTH; i-- > 0; ) {

    for (j = 0; j < HASH_LENGTH; j++) {
      switch (transactionTrits[offset++]) {
        case 0: {
          states.low[j] = HIGH_BITS;
          states.high[j] = HIGH_BITS;
        } break;
        case 1: {
          states.low[j] = LOW_BITS;
          states.high[j] = HIGH_BITS;
        } break;
        default: {
          states.low[j] = HIGH_BITS;
          states.high[j] = LOW_BITS;
        }
      }
    }
    transform(states);
  }
  states.low[0] = LOW_0;   //0b1101101101101101101101101101101101101101101101101101101101101101L; 
  states.high[0] = HIGH_0; //0b1011011011011011011011011011011011011011011011011011011011011011L;
  states.low[1] = LOW_1;   //0b1111000111111000111111000111111000111111000111111000111111000111L; 
  states.high[1] = HIGH_1; //0b1000111111000111111000111111000111111000111111000111111000111111L;
  states.low[2] = LOW_2;   //0b0111111111111111111000000000111111111111111111000000000111111111L; 
  states.high[2] = HIGH_2; //0b1111111111000000000111111111111111111000000000111111111111111111L;
  states.low[3] = LOW_3;   //0b1111111111000000000000000000000000000111111111111111111111111111L; 
  states.high[3] = HIGH_3; //0b0000000000111111111111111111111111111111111111111111111111111111L;
  */
