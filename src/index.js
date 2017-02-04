import turbo from './gl2c'
import PearlDiver from './search'

{
  var pearlDiver = new PearlDiver();
  var minWeightMagnitude = 13;
  var testTrits = new Int32Array(8019);
  for(var i=0; i < testTrits.length; i++) testTrits[i] = Math.floor(Math.random() * 3) - 1;
  var p1 = pearlDiver.search(testTrits, minWeightMagnitude);
  p1.then((hash) => {
    console.log("hashed");
    console.log(hash);
  }).catch((err) => {
    console.log("error occured");
    console.log(err);
  });
}
