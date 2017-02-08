import PearlDiver from './pearldiver'

var pearlDiver = new PearlDiver();

export default {
  pow: (t,m) => pearlDiver.search(t,m),
  interrupt: () => pearlDiver.interrupt()
}
