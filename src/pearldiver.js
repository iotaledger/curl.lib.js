const Converter = require('iota.crypto.js').converter;
const Curl = require("./curl");
const WebGL = require('./WebGL');
const SearchInit = require('./searchInit');
const KRNL = require('./shaders');
const Const = require('./constants');

const MAXIMAGESIZE = Math.pow(document.createElement('canvas').getContext('webgl2').MAX_TEXTURE_SIZE, 2) * 0.50;
let dim = {};
const TEXELSIZE = 4;

dim.x = Const.STATE_LENGTH+1;
const IMAGE_SIZE= Math.floor(MAXIMAGESIZE / dim.x / TEXELSIZE ) * dim.x * TEXELSIZE;//DIM.X*TEXELSIZE*2;
dim.y = IMAGE_SIZE / dim.x / TEXELSIZE ;

const pack = (l) => (r,k,i) => (i%l ===0 ? r.push([k]): r[r.length-1].push(k)) && r;

const pearlDiverCallback = (res, transactionTrits, minWeightMagnitude, m_self) => 
{
  return (nonce, searchObject) => {
    res(Converter.trytes(nonce));
  }
}

const PearlDiverInstance = (offset) => {
  if(WebGL) {
    let instance = new Object();
    try {
      instance.offset = dim.y * (offset || 0);
      instance.context = WebGL.worker(IMAGE_SIZE, dim);
      instance.buf = instance.context.ipt.data;
      WebGL.addProgram(instance.context, "init", KRNL.init, "gr_offset");
      WebGL.addProgram(instance.context, "increment", KRNL.increment);
      WebGL.addProgram(instance.context, "twist", KRNL.transform);
      WebGL.addProgram(instance.context, "check", KRNL.check, "minWeightMagnitude");
      WebGL.addProgram(instance.context, "col_check", KRNL.col_check);
      WebGL.addProgram(instance.context, "finalize", KRNL.finalize);
      instance.state = "READY";
      instance.queue = [];
      return instance;
    } catch(e) {
      return null;
    }
  }
}

const search = (instance, states, minWeight) =>{
  if(!instance.context) {
    Promise.reject(new Error("Webgl2 Is not Available"));
  } else if (minWeight >= Const.HASH_LENGTH || minWeight <= 0) {
    Promise.reject(new Error("Bad Min-Weight Magnitude"));
  }
  return new Promise((res, rej) => {
    instance.queue.push({
      states: states, 
      mwm: minWeight, 
      call: pearlDiverCallback(res, states, minWeight, instance)
    });
    if(instance.state == "READY") doNext(instance);
  });
}

const interrupt = (instance) => {
  if(instance.state == "SEARCHING") instance.state = "INTERRUPTED";
}

const doNext = (instance) => {
  var next = instance.queue.shift();
  if(instance.state != "SEARCHING") {
    if(next != null) {
      instance.state = "SEARCHING";
      _WebGLFindNonce(instance, next);
    } 
  } else {
    instance.state = "READY";
  }
}

const _save = (instance, searchObject) => {
  instance.buf.reduce(pack(4), []).slice(0,Const.STATE_LENGTH)
    .reduce((a,v)=> a.map((c,i) => c.push(v[i]))&& a, [[],[]])
    .reduce((a,v,i) => (i%2 ? a.set("high", v) : a.set("low", v)) && a, new Map())
    .forEach((v,k) => searchObject.states[k] = v);
  instance.queue.unshift(searchObject);
}

const _WebGLWriteBuffers = (instance, states) => {
  for(var i = 0; i < Const.STATE_LENGTH; i++) {
    instance.buf[i * TEXELSIZE] = states.low[i];
    instance.buf[i * TEXELSIZE + 1] = states.high[i];
    instance.buf[i * TEXELSIZE + 2] = states.low[i];
    instance.buf[i * TEXELSIZE + 3] = states.high[i];
  }
}


const _WebGLSearch = (instance, searchObject) => {
  WebGL.run(instance.context, "increment");
  WebGL.run(instance.context, "twist", Const.NUMBER_OF_ROUNDS);
  WebGL.run(instance.context, "check", 1, {n:"minWeightMagnitude", v: searchObject.mwm});
  WebGL.run(instance.context, "col_check");

  if(WebGL.readData(instance.context, Const.STATE_LENGTH,0, 1, 1)[2] === -1 ) {
    if(instance.state == "INTERRUPTED") return instance._save(searchObject);
    //requestAnimationFrame(() => instance._WebGLSearch(searchObject));
    setTimeout(() => _WebGLSearch(instance, searchObject), 1);
  } else {
    WebGL.run(instance.context, "finalize");
    searchObject.call(
      WebGL.readData(instance.context, 0,0,dim.x,1)
      .reduce(pack(4), [])
      .slice(0, Const.HASH_LENGTH)
      .map(x => x[3]), 
      searchObject);
    doNext(instance);
  }
}

const _WebGLFindNonce = (instance, searchObject) => {
  _WebGLWriteBuffers(instance, searchObject.states);
  WebGL.writeData(instance.context, instance.buf);
  WebGL.run(instance.context, "init", 1, {n: "gr_offset", v: instance.offset});
  //requestAnimationFrame(() => instance._WebGLSearch(searchObject));
  setTimeout(() => _WebGLSearch(instance, searchObject), 1);
}
const searchWithCallback = (instance, transactionTrytes, minWeightMagnitude, callback, err) => {
  if (transactionTrits.length < Const.TRANSACTION_LENGTH - Const.HASH_LENGTH) return null;
  var curl = new Curl();
  let transactionTrits = Converter.trits(transactionTrytes);
  curl.absorb(transactionTrits, 0, Const.TRANSACTION_LENGTH - Const.HASH_LENGTH);
  const states = SearchInit.toPair(curl.state, minWeightMagnitude);
  search(instance, states, minWeightMagnitude).then(callback).catch(err);
}
const offsetState = (state) => {
    return SearchInit.toPair(Converter.trits(state));
}
const prepare = (transactionTrytes, minWeightMagnitude) => {
  var curl = new Curl();
  let transactionTrits = Converter.trits(transactionTrytes);
  curl.absorb(transactionTrits, 0, Const.TRANSACTION_LENGTH - Const.HASH_LENGTH);
  states = SearchInit.toPair(curl.state);
  return states;
}

module.exports = {
  instance: PearlDiverInstance,
  getHashCount: () => { return dim.y; },
  offsetState,
  prepare,
  search,
  doNext,
};
