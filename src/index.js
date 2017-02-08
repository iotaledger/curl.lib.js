import PearlDiver from './pearldiver'

var pearlDiver = new PearlDiver();

export default {
  pow: (t,m) => pearlDiver.search(t,m),
  interrupt: () => pearlDiver.interrupt(),
  resume: () => pearlDiver.doNext(),
  remove: () => pearlDiver.queue.unshift()
}
