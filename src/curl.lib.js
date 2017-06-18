import PearlDiver from './pearldiver'

let pdInstance = new PearlDiver();

export default {
  pow: (options, success, error) => {
    let state;
    if (options.trytes == null) {
      state = pdInstance.offsetState(options.state);
      console.log("offset states");
    } else if (options.state == null) {
      state = pdInstance.prepare(options.trytes);
      console.log("prepared trytes");
    } else {
      error("Error: no trytes or state matrix provided");
    }
    let powPromise = pdInstance.search(state, options.minWeight)
    if(typeof success === 'function') {
      powPromise.then(success).catch(error)
    }
    return powPromise;
  }, 
  prepare: (trytes) => {
    pdInstance.prepare(trytes);
  },
  /*
  pow: (trytes, minWeight, callback, error) => {
    var powPromise = pdInstance.search(trytes, minWeight)
    if(typeof callback === 'function') {
      powPromise.then(callback).catch(error)
    }
    return powPromise;
  }, */
  setOffset: (o) => pdInstance.setOffset(o),
  interrupt: () => pdInstance.interrupt(),
  resume: () => pdInstance.doNext(),
  remove: () => pdInstance.queue.unshift(),
  getHashRows: (c) => c(pdInstance.getHashCount()),
}
