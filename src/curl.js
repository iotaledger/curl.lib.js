const Const = require('./constants');

/**
 **      Cryptographic related functions to IOTA's Curl (sponge function)
 **/

function Curl(state) {
  // truth table
  this.truthTable = new Int8Array([1, 0, -1, 2, 1, -1, 0, 2, -1, 1, 0]);
  this.HASH_LENGTH = Const.HASH_LENGTH;
  this.initialize(state);
  this.reset();
}

/**
 *   Initializes the state with 729 trits
 *
 *   @method initialize
 **/
Curl.prototype.initialize = function(state, length) {

  if (state) {
    this.state = state;
  } else {
    this.state = new Int8Array(Const.STATE_LENGTH);
  }
}

Curl.prototype.reset = function() {
  this.state.fill(0);
}

/**
 *   Sponge absorb function
 *
 *   @method absorb
 **/
Curl.prototype.absorb = function(trits, offset, length) {

  do {

    var i = 0;
    var limit = (length < Const.HASH_LENGTH ? length : Const.HASH_LENGTH);

    while (i < limit) {

      this.state[i++] = trits[offset++];
    }

    this.transform();

  } while (( length -= Const.HASH_LENGTH ) > 0)

}

/**
 *   Sponge squeeze function
 *
 *   @method squeeze
 **/
Curl.prototype.squeeze = function(trits, offset, length) {

  do {

    var i = 0;
    var limit = (length < Const.HASH_LENGTH ? length : Const.HASH_LENGTH);

    while (i < limit) {

      trits[offset++] = this.state[i++];
    }

    this.transform();

  } while (( length -= Const.HASH_LENGTH ) > 0)
}

/**
 *   Sponge transform function
 *
 *   @method transform
 **/
Curl.prototype.transform = function() {

  var stateCopy = [], index = 0;

  for (var round = 0; round < Const.NUMBER_OF_ROUNDS; round++) {

    stateCopy = this.state.slice();

    for (var i = 0; i < Const.STATE_LENGTH; i++) {

      this.state[i] = this.truthTable[stateCopy[index] + (stateCopy[index += (index < 365 ? 364 : -365)] <<2) + 5];
    }
  }
}

module.exports = Curl;
