import PearlDiver from './pearldiver'

var pdInstance = new PearlDiver();

export default {
  pow: (t,m,c) => {
    var p = pdInstance.search(t,m)
    if(typeof c === 'function') {
      p.then(c).catch(c)
    }
    return p;
  },
  setOffset: (o) => pdInstance.setOffset(o),
  interrupt: () => pdInstance.interrupt(),
  resume: () => pdInstance.doNext(),
  remove: () => pdInstance.queue.unshift(),
  getHashCount: () => pdInstance.getHashCount(),
}
