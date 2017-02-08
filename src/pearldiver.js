import Turbo from './gl2c'
import searchInit, {transform} from './searchInit'
import * as KRNL from './kernel'
import * as Const from './constants'
import * as Converter from "iota.lib.js/lib/crypto/converter"
import Curl from "iota.lib.js/lib/crypto/curl"
import t from "./test"

let MAXIMAGESIZE = 1e6;
let dim = {};
let texelSize = 4;

dim.x = Const.STATE_LENGTH+1;
let imageSize= Math.floor(MAXIMAGESIZE / dim.x / texelSize ) * dim.x * texelSize;//dim.x*texelSize*2;
dim.y = imageSize / dim.x / texelSize ;

var pack = (l) => (r,k,i) => (i%l ===0 ? r.push([k]): r[r.length-1].push(k)) && r;

function pearlDiverCallback (res, transactionTrits, minWeightMagnitude, m_self)
{
  return (hash, searchObject) => {
    Array.prototype.splice.apply(transactionTrits, [
      Const.TRANSACTION_LENGTH-Const.HASH_LENGTH,
      Const.HASH_LENGTH,
      ...hash]);
    res(hash);
  }
}

export default class {
  constructor() {
    if(Turbo) {
      this.turbo = new Turbo(imageSize, dim);
      this.buf = this.turbo.ipt.data;
      this.turbo.addProgram("init", KRNL.headers + KRNL.add + KRNL.offset + KRNL.k_init);
      this.turbo.addProgram("increment", KRNL.headers + KRNL.add + KRNL.increment);
      this.turbo.addProgram("twist", KRNL.headers + KRNL.barrier + KRNL.twist + KRNL.twistMain);
      this.turbo.addProgram("check", KRNL.headers + KRNL.do_check + KRNL.k_check, "minWeightMagnitude");
      this.turbo.addProgram("col_check", KRNL.headers + KRNL.k_col_check);
      this.turbo.addProgram("finalize", KRNL.headers + KRNL.do_check + KRNL.finalize);
      this.findNonce = this._turboFindNonce;
      this.state = "READY";
      this.queue = [];
    }
  }

  search(transactionTrits, minWeightMagnitude) {
    return new Promise((res, rej) => {
      if (transactionTrits.length != Const.TRANSACTION_LENGTH) rej(new Error("Incorrect Transaction Length"));
      else if(minWeightMagnitude >= Const.HASH_LENGTH || minWeightMagnitude <= 0) rej(new Error("Bad Min-Weight Magnitude"));
      else {
        var states = {
          low : new Int32Array(Const.STATE_LENGTH),
          high : new Int32Array(Const.STATE_LENGTH)
        };
        searchInit(states, transactionTrits);

        this.queue.push({
          states: states, 
          mwm: minWeightMagnitude, 
          call: pearlDiverCallback(res, transactionTrits, minWeightMagnitude, this)
        });
        if(this.state == "READY") this.doNext();
      }
    });
  }

  interrupt() {
    if(this.state == "SEARCHING") this.state = "INTERRUPTED";
  }

  doNext() {
    var next = this.queue.shift();
      if(this.state != "SEARCHING") {
      if(next != null) {
        this.state = "SEARCHING";
        this.findNonce(next);
      } else {
        this.state = "READY";
      }
    }
  }

  _save(searchObject) {
    this.buf.reduce(pack(4), []).slice(0,Const.STATE_LENGTH)
      .reduce((a,v)=> a.map((c,i) => c.push(v[i]))&& a, [[],[]])
      .reduce((a,v,i) => (i%2 ? a.set("high", v) : a.set("low", v)) && a, new Map())
      .forEach((v,k) => searchObject.states[k] = v);
    this.queue.unshift(searchObject);
  }

  _turboWriteBuffers(states) {
    for(var i = 0; i < Const.STATE_LENGTH; i++) {
      this.buf[i * texelSize] = states.low[i];
      this.buf[i * texelSize + 1] = states.high[i];
    }
  }

  _turboNext(searchObject) {
    this.buf = this.turbo.run("check", null, {n:"minWeightMagnitude", v: searchObject.mwm});
    if(this.turbo.run("col_check")[dim.x * texelSize - 2] === -1 )
      requestAnimationFrame(() => this._turboSearch(searchObject));
    else
      this._turboFinish(searchObject);
  }

  _turboFinish(searchObject) {
    var buf = this.turbo.run("finalize").reduce(pack(4), []);
    console.log("STL:" + buf[Const.STATE_LENGTH]);
    if(searchObject.call(buf.slice(0, Const.HASH_LENGTH).map(x => x[3]), searchObject))
      this.doNext();
  }

  _turboSearch(searchObject) {
    if(this.state == "INTERRUPTED") return this._save(searchObject);
    console.log("still looking...");
    this.turbo.run("increment");
    for(var i = 27; i-- > 0;) this.turbo.run("twist");
    this._turboNext(searchObject);
  }

  _turboFindNonce(searchObject) {
    this._turboWriteBuffers(searchObject.states);
    this.turbo.run("init", this.buf);
    requestAnimationFrame(() => this._turboSearch(searchObject));
  }
}
