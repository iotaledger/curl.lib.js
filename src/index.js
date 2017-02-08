import PearlDiver from './pearldiver'
//import '../test'
var pearlDiver = new PearlDiver();

export default {
  pow: pearlDiver.search,
  interrupt: pearlDiver.interrupt
}
