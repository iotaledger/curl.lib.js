import PearlDiver from './pearldiver'

var pdInstance = new PearlDiver();

export default {
  pow: (t,m) => pdInstance.search(t,m),
  interrupt: () => pdInstance.interrupt(),
  resume: () => pdInstance.doNext(),
  remove: () => pdInstance.queue.unshift()
}
