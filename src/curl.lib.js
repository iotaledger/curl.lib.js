import PearlDiver from './pearldiver'

let pdInstance = new PearlDiver();

export default {
  pow: (trytes, minWeight, callback, error) => {
    var powPromise = pdInstance.search(trytes, minWeight)
    if(typeof callback === 'function') {
      powPromise.then(callback).catch(error)
    }
    return powPromise;
  },
  setOffset: (o) => pdInstance.setOffset(o),
  interrupt: () => pdInstance.interrupt(),
  resume: () => pdInstance.doNext(),
  remove: () => pdInstance.queue.unshift(),
  getHashRows: (c) => c(pdInstance.getHashCount()),
}
