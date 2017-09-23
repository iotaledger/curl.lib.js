const Const = require('./constants')
let 
  TRYTE_LENGTH = 2673,
  TRANSACTION_LENGTH= TRYTE_LENGTH * 3,
  LOW_BITS= 0,//00000000,
  HIGH_BITS= -1,//0xFFFFFFFF,//FFFFFFFF,4294967295, 
  LOW_0= 0xDB6DB6DB,//6DB6DB6D,
  LOW_1= 0xF1F8FC7E,//3F1F8FC7,
  LOW_2= 0x7FFFE00F,//FFFC01FF,
  LOW_3= 0xFFC00000,//07FFFFFF,
  HIGH_0= 0xB6DB6DB6,//DB6DB6DB,
  HIGH_1= 0x8FC7E3F1,//F8FC7E3F,
  HIGH_2= 0xFFC01FFF,//F803FFFF,
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


function offset(states, offset) {
  states.low [offset + 0] = LOW_0;
  states.low [offset + 1] = LOW_1;
  states.low [offset + 2] = LOW_2;
  states.low [offset + 3] = LOW_3;
  states.high[offset + 0] = HIGH_0;
  states.high[offset + 1] = HIGH_1;
  states.high[offset + 2] = HIGH_2;
  states.high[offset + 3] = HIGH_3;
}

function toPair(state) {
  const states = {
    low : new Int32Array(Const.STATE_LENGTH),
    high : new Int32Array(Const.STATE_LENGTH)
  }
  state.forEach((trit, i) => {
    switch (trit) {
      case 0: {
        states.low[i] = HIGH_BITS;
        states.high[i] = HIGH_BITS;
      } break;
      case 1: {
        states.low[i] = LOW_BITS;
        states.high[i] = HIGH_BITS;
      } break;
      default: {
        states.low[i] = HIGH_BITS;
        states.high[i] = LOW_BITS;
      }
    }
  });
  offset(states, Const.NONCE_START);
  return states;
}

function transform(states) {
  var scratchpadHigh, scratchpadLow
  var scratchpadIndex = 0, round, stateIndex;
  var alpha, beta, gamma, delta;

  for (round = Const.NUMBER_OF_ROUNDS; round-- > 0; ) {
    scratchpadLow = states.low.slice();
    scratchpadHigh = states.high.slice();

    for (stateIndex = 0; stateIndex < Const.STATE_LENGTH; stateIndex++) {
      alpha = scratchpadLow[scratchpadIndex];
      beta = scratchpadHigh[scratchpadIndex];
      gamma = scratchpadHigh[scratchpadIndex += (scratchpadIndex < 365 ? 364 : -365)];
      delta = (alpha | (~gamma)) & (scratchpadLow[scratchpadIndex] ^ beta);

      states.low[stateIndex] = ~delta;
      states.high[stateIndex] = (alpha ^ gamma) | delta;
    }
  }
}

module.exports = { toPair, transform };
/*
export default function (states, transactionTrits) {
  var i, offset = 0;
  var j;
  //for (i = HASH_LENGTH; i < STATE_LENGTH; i++) {
  for (i = 0; i < Const.STATE_LENGTH; i++) {
    if (i >= Const.HASH_LENGTH && i < Const.STATE_LENGTH) {
      states.low[i] = HIGH_BITS;
      states.high[i] = HIGH_BITS;
    } else {
      states.low[i] = 0;
      states.high[i] = 0;
    }
  }

  for (i = (Const.TRANSACTION_LENGTH - Const.HASH_LENGTH) / Const.HASH_LENGTH; i-- > 0; ) {

    for (j = 0; j < Const.HASH_LENGTH; j++) {
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
}
*/
