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
    var check = async (txTrytes) => {
      return new Promise(function (resolve, reject) {
        let trytes = txTrytes.substr(0, txTrytes.length-81*3).concat(trunkTransaction).concat(branchTransaction);
        pow({ trytes,minWeight}).then((nonce) => {
          resolve(trytes.concat(nonce))
        })
      });
    }
    (async() => {
      var trytes = []
      for(var txTrytes of trytesArray) {
        var result = await check(txTrytes)
        console.log('got PoW! ' + result);
        trytes.push(result)
      }
      callback(null, trytes);
    })()
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
