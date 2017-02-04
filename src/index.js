import turbo from './gl2c'
import PearlDiver from './search'

{
  var pearlDiver = new PearlDiver();
  var minWeightMagnitude = 13;
  var testTrits = new Int32Array(8019);
  for(var i=0; i < testTrits.length; i++) testTrits[i] = Math.floor(Math.random() * 3) - 1;
  var start = Date.now();
  var p1 = pearlDiver.search(testTrits, minWeightMagnitude);
  p1.then((hash) => {
    console.log("hashed mwm of " + minWeightMagnitude + " in " + (Date.now()-start)/1e3 +"s");
    console.log(hash.slice());
  }).catch((err) => {
    console.log("error occured");
    console.log(err);
  });
}
