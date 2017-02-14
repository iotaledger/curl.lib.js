import PearlDiver from './pearldiver'

var pdInstance = new PearlDiver();

export default {
  pow: (t,m,o) => pdInstance.search(t,m,o),
  interrupt: () => pdInstance.interrupt(),
  resume: () => pdInstance.doNext(),
  remove: () => pdInstance.queue.unshift(),
  getHashCount: () => pdInstance.getHashCount(),
}
