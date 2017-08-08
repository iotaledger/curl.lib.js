import PearlDiver from './pearldiver'

let pdInstance = new PearlDiver();

let pow = (options, success, error) => {
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
  };

let overrideAttachToTangle = function(api) {
  api.attachToTangle = function(trunkTransaction, branchTransaction, minWeight, trytesArray, callback) {
    trytesArray.map(txTrytes => {
      let trytes = txTrytes.substr(0, txTrytes.length-81*3).concat(trunkTransaction).concat(branchTransaction);
      let promise = pow({ trytes,minWeight})
        .then((nonce) => callback(null, trytes.concat(nonce)))
        .catch((err) => callback(err));
      return promise;
    })
  }
}

export default {
  pow, 
  prepare: (trytes) => {
    pdInstance.prepare(trytes);
  },
  setOffset: (o) => pdInstance.setOffset(o),
  interrupt: () => pdInstance.interrupt(),
  resume: () => pdInstance.doNext(),
  remove: () => pdInstance.queue.unshift(),
  getHashRows: (c) => c(pdInstance.getHashCount()),
  overrideAttachToTangle
}
