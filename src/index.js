import turbo from './gl2c'
import PearlDiver from './search'
import Curl from "iota.lib.js/lib/crypto/curl"
import * as Converter from "iota.lib.js/lib/crypto/converter"
import * as Const from './constants'


{
  var curl =  new Curl();
  curl.initialize(new Int32Array(Const.STATE_LENGTH));
  var pearlDiver = new PearlDiver();
  var minWeightMagnitude = 3;
  var testTrits = new Int32Array(Const.TRANSACTION_LENGTH);
  for(var i=0; i < testTrits.length; i++) testTrits[i] = Math.floor(Math.random() * 3) - 1;
  var start = Date.now();
  var p1 = pearlDiver.search(testTrits, minWeightMagnitude);
  p1.then((hash) => {
    var diff = (Date.now()-start)/1e3 ;
    var output = [...testTrits.slice(0,Const.TRANSACTION_LENGTH-Const.HASH_LENGTH), ...hash];
    var checkHash = new Int32Array(Const.HASH_LENGTH);

    console.log("hashed mwm of " + minWeightMagnitude + " in " + diff +"s. OL: " + output.length);

    curl.absorb(output);
    curl.squeeze(checkHash);

    console.log(checkHash.slice(Const.HASH_LENGTH-minWeightMagnitude*3,Const.HASH_LENGTH));
    console.log(Converter.trytes(checkHash));
  }).catch((err) => {
    console.log(err);
  });
}
