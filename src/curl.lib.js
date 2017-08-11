import PearlDiver from './pearldiver'
import Curl from "./curl"
import * as Const from './constants'
import {trits, trytes} from "iota.lib.js/lib/crypto/converter"

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
    let branch = branchTransaction; 
    let trunk = trunkTransaction;
    var doWork = async (txTrytes) => {
      return new Promise(function (resolve, reject) {
        let trytes = txTrytes.substr(0, txTrytes.length-81*3).concat(trunk).concat(branch);
        pow({ trytes,minWeight}).then((nonce) => {
          resolve(trytes.concat(nonce))
        })
      });
    }
    (async() => {
      var trytes = []
      let curl = new Curl();
      let hash = new Int32Array(Const.HASH_LENGTH);
      for(var txTrytes of trytesArray) {
        var result = await doWork(txTrytes)
        console.log('got PoW! ' + result);
        curl.initialize(new Int32Array(Const.STATE_LENGTH));
        curl.absorb(trits(result));
        curl.squeeze(hash);
        branch = trunk;
        trunk = trytes(hash);
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
