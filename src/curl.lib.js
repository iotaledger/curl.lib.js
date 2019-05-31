const PearlDiver = require('./pearldiver');
const Curl = require("./curl");
const Const = require('./constants');
const Converter = require('iota.crypto.js').converter;
const NONCE_TIMESTAMP_LOWER_BOUND = 0;
const NONCE_TIMESTAMP_UPPER_BOUND = Converter.fromValue(0xffffffffffffffff);
const MAX_TIMESTAMP_VALUE = (Math.pow(3,27) - 1) / 2 

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

const overrideAttachToTangle = iota => {
  iota.api.attachToTangle = (
    trunkTransaction,
    branchTransaction,
    minWeight,
    trytes,
    callback
  ) => {
  const ccurlHashing = function(trunkTransaction, branchTransaction, minWeight, trytes, callback) {
    const iotaObj = iota

    // inputValidator: Check if correct hash
    if (!iotaObj.valid.isHash(trunkTransaction)) {
      return callback(new Error("Invalid trunkTransaction"))
    }

    // inputValidator: Check if correct hash
    if (!iotaObj.valid.isHash(branchTransaction)) {
      return callback(new Error("Invalid branchTransaction"))
    }

    // inputValidator: Check if int
    if (!iotaObj.valid.isValue(minWeight)) {
      return callback(new Error("Invalid minWeightMagnitude"))
    }

    var finalBundleTrytes = []
    var previousTxHash
    var i = 0

    function loopTrytes() {
      getBundleTrytes(trytes[i], function(error) {
        if (error) {
          return callback(error)
        } else {
          i++
          if (i < trytes.length) {
            loopTrytes()
          } else {
            // reverse the order so that it's ascending from currentIndex
            return callback(null, finalBundleTrytes.reverse())
          }
        }
      })
    }

    function getBundleTrytes(thisTrytes, callback) {
      // PROCESS LOGIC:
      // Start with last index transaction
      // Assign it the trunk / branch which the user has supplied
      // IF there is a bundle, chain  the bundle transactions via
      // trunkTransaction together

      var txObject = iotaObj.utils.transactionObject(thisTrytes)
      txObject.tag = txObject.tag || txObject.obsoleteTag
      txObject.attachmentTimestamp = Date.now()
      txObject.attachmentTimestampLowerBound = 0
      txObject.attachmentTimestampUpperBound = MAX_TIMESTAMP_VALUE
      // If this is the first transaction, to be processed
      // Make sure that it's the last in the bundle and then
      // assign it the supplied trunk and branch transactions
      if (!previousTxHash) {
        // Check if last transaction in the bundle
        if (txObject.lastIndex !== txObject.currentIndex) {
          return callback(
            new Error(
              "Wrong bundle order. The bundle should be ordered in descending order from currentIndex"
            )
          )
        }

        txObject.trunkTransaction = trunkTransaction
        txObject.branchTransaction = branchTransaction
      } else {
        // Chain the bundle together via the trunkTransaction (previous tx in the bundle)
        // Assign the supplied trunkTransaciton as branchTransaction
        txObject.trunkTransaction = previousTxHash
        txObject.branchTransaction = trunkTransaction
      }

      var newTrytes = iotaObj.utils.transactionTrytes(txObject)

      curl
        .pow({ trytes: newTrytes, minWeight: minWeight })
        .then(function(nonce) {
          var returnedTrytes = newTrytes.substr(0, 2673 - 81).concat(nonce)
          var newTxObject = iotaObj.utils.transactionObject(returnedTrytes)

          // Assign the previousTxHash to this tx
          var txHash = newTxObject.hash
          previousTxHash = txHash

          finalBundleTrytes.push(returnedTrytes)
          callback(null)
        })
        .catch(callback)
    }
    loopTrytes()
  }
  ccurlHashing(trunkTransaction, branchTransaction, minWeight, trytes, function(error, success) {
    if (error) {
        console.log(error);
    } else {
        console.log(success);
    }
    if (callback) {
        return callback(error, success);
    } else {
        return success;
    }
  })
  }
}

window.curl = module.exports = {
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
