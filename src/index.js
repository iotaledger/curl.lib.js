import turbo from './gl2c'
import PearlDiver from './search'
import Curl from "iota.lib.js/lib/crypto/curl"
import * as Converter from "iota.lib.js/lib/crypto/converter"


{
  var TRANSACTION_LENGTH = 8019;
  var HASH_LENGTH = 243;
  var STATE_LENGTH = HASH_LENGTH*3;
  var curl =  new Curl();
  curl.initialize(new Int32Array(STATE_LENGTH));
  var pearlDiver = new PearlDiver();
  var minWeightMagnitude = 13;
  var testTrits = new Int32Array(TRANSACTION_LENGTH);
  for(var i=0; i < testTrits.length; i++) testTrits[i] = Math.floor(Math.random() * 3) - 1;
  var start = Date.now();
  var p1 = pearlDiver.search(testTrits, minWeightMagnitude);
  p1.then((hash) => {
    var diff = (Date.now()-start)/1e3 ;
    var output = [...testTrits.slice(0,TRANSACTION_LENGTH-HASH_LENGTH), ...hash];
    var checkHash = new Int32Array(HASH_LENGTH);

    console.log("hashed mwm of " + minWeightMagnitude + " in " + diff +"s. OL: " + output.length);

    curl.absorb(output);
    curl.squeeze(checkHash);

    console.log(Converter.trytes(checkHash));
  }).catch((err) => {
    console.log(err);
  });
}
