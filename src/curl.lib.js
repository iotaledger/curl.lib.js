const PearlDiver = require('./pearldiver');
const Curl = require("./curl");
const Const = require('./constants');
const Converter = require('iota.crypto.js').converter;
const NONCE_TIMESTAMP_LOWER_BOUND = 0;
const NONCE_TIMESTAMP_UPPER_BOUND = Converter.fromValue(0xffffffffffffffff);

let pdInstance;

const pow = (options, success, error) => {
  let state;
  if ('trytes' in options) {
    state = PearlDiver.prepare(options.trytes);
  } else if ('state' in options) {
    state = PearlDiver.offsetState(options.state);
  } else {
    error("Error: no trytes or state matrix provided");
  }
  let powPromise = PearlDiver.search(pdInstance, state, options.minWeight)
  if(typeof success === 'function') {
    powPromise.then(success).catch(error)
  }
  return powPromise;
};

const TAG_TRINARY_START = 2295;
const TAG_TRINARY_SIZE = 27;

const setTimestamp = (state) => {
  const timestamp = state.subarray(Const.TIMESTAMP_START, Const.TIMESTAMP_LOWER_BOUND_START);
  const upper = state.subarray(Const.TIMESTAMP_UPPER_BOUND_START, Const.NONCE_START);
  timestamp.fill(0);
  Converter.fromValue(Date.now()).map((v, i) => timestamp[i] = v);
  state.subarray(Const.TIMESTAMP_LOWER_BOUND_START, Const.TIMESTAMP_UPPER_BOUND_START).fill(0);
  upper.fill(0);
  NONCE_TIMESTAMP_UPPER_BOUND.map((v,i) => upper[i] = v);
}

const overrideAttachToTangle = (api) => {
  api.attachToTangle = (
    trunkTransaction, 
    branchTransaction, 
    minWeight, 
    trytesArray, 
    callback
  ) => {
    let branch = branchTransaction; 
    let trunk = trunkTransaction;
    const curl = new Curl();
    const hash = new Int8Array(Const.HASH_LENGTH);
    var doWork = (txTrytes) => {
      return new Promise(function (resolve, reject) {
        curl.reset();
        const trytes = txTrytes.substr(0, txTrytes.length-81*3).concat(trunk).concat(branch);
        curl.absorb(Converter.trits(trytes), 0, Const.TRANSACTION_LENGTH - Const.HASH_LENGTH);
        Converter.trits(txTrytes.substr(txTrytes.length-81, txTrytes.length)).forEach((v,i) => curl.state[i] = v);
        Converter.trits(txTrytes.substr(TAG_TRINARY_START, TAG_TRINARY_START + TAG_TRINARY_SIZE)).forEach((v,i) => curl.state[i] = v);
        setTimestamp(curl.state);
        pow({ state: Converter.trytes(curl.state), minWeight}).then((nonce) => {
          resolve(trytes.concat(nonce))
        })
      });
    }
    var trytes = []
    function doNext(i) {
      if(i == trytesArray.length) {
        callback(null, trytes);
      } else {
        doWork(trytesArray[i]).then(function(result) {
          console.log('result:', result);
          var resultTrits = Converter.trits(result);
          curl.reset();
          curl.absorb(resultTrits, 0, resultTrits.length);
          curl.squeeze(hash, 0, Const.HASH_LENGTH);
          branch = trunk;
          trunk = Converter.trytes(hash);
          trytes.push(result)
          doNext(i + 1);
        }).catch(callback);
      }
    }
    doNext(0);
  }
}

module.exports = {
  init: () => { 
    pdInstance = PearlDiver.instance(); 
    if(pdInstance == null) {
      return false;
    }
    return true;
  },
  pow,
  prepare: PearlDiver.prepare,
  setOffset: (o) => {pdInstance.offset = o},
  interrupt: () => interrupt(pdInstance),
  resume: () => PearlDiver.doNext(pdInstance),
  remove: () => pdInstance.queue.unshift(),
  //getHashRows: (c) => c(PearlDiver.getHashCount()),
  overrideAttachToTangle
}
