import WebGL from './WebGL'
import searchInit, {transform} from './searchInit'
import KRNL from './shaders'
import * as Const from './constants'

let MAXIMAGESIZE = Math.pow(document.createElement('canvas').getContext('webgl2').MAX_TEXTURE_SIZE, 2) * 0.99;//was 1e6;
let dim = {};
let texelSize = 4;

dim.x = Const.STATE_LENGTH+1;
let imageSize= Math.floor(MAXIMAGESIZE / dim.x / texelSize ) * dim.x * texelSize;//dim.x*texelSize*2;
dim.y = imageSize / dim.x / texelSize ;

var pack = (l) => (r,k,i) => (i%l ===0 ? r.push([k]): r[r.length-1].push(k)) && r;

function pearlDiverCallback (res, transactionTrits, minWeightMagnitude, m_self)
{
  return (hash, searchObject) => {
    /*
    Array.prototype.splice.apply(transactionTrits, [
      Const.TRANSACTION_LENGTH-Const.HASH_LENGTH,
      Const.HASH_LENGTH,
      ...hash]);
      */
    //res(hash);
    res([...transactionTrits.slice(0,Const.TRANSACTION_LENGTH-Const.HASH_LENGTH), ...hash]);
  }
}

export default class PearlDiver {
  constructor(offset) {
    if(WebGL) {
      this.offset = dim.y * (offset || 0);
      this.context = new WebGL(imageSize, dim);
      this.buf = this.context.ipt.data;
      this.context.addProgram("init", KRNL.init, "gr_offset");
      this.context.addProgram("increment", KRNL.increment);
      this.context.addProgram("twist", KRNL.transform);
      this.context.addProgram("check", KRNL.check, "minWeightMagnitude");
      this.context.addProgram("col_check", KRNL.col_check);
      this.context.addProgram("finalize", KRNL.finalize);
      this.findNonce = this._WebGLFindNonce;
      this.state = "READY";
      this.queue = [];
    }
  }

  getHashCount() { return dim.y; }

  setOffset(o) { this.offset = o }

  search(transactionTrits, minWeightMagnitude) {
    return new Promise((res, rej) => {
      if (this.context == null) rej(new Error("Webgl2 Is not Available"));
      else if (transactionTrits.length != Const.TRANSACTION_LENGTH) rej(new Error("Incorrect Transaction Length"));
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

  _WebGLWriteBuffers(states) {
    for(var i = 0; i < Const.STATE_LENGTH; i++) {
      this.buf[i * texelSize] = states.low[i];
      this.buf[i * texelSize + 1] = states.high[i];
      this.buf[i * texelSize + 2] = states.low[i];
      this.buf[i * texelSize + 3] = states.high[i];
    }
  }


  _WebGLSearch(searchObject) {
    if(this.state == "INTERRUPTED") return this._save(searchObject);
    this.context.run("increment");
    for(var i = 27; i-- > 0;) {
      this.context.run("twist");
    }
    this.context.run("check", null, {n:"minWeightMagnitude", v: searchObject.mwm});
    this.context.run("col_check");
    if(this.context.readData(0,0, dim.x, dim.y)[dim.x * texelSize - 2] === -1 )
      requestAnimationFrame(() => this._WebGLSearch(searchObject));
    else {
      this.context.run("finalize");
      if(searchObject.call(
        this.context.readData()
        .reduce(pack(4), [])
        .slice(0, Const.HASH_LENGTH)
        .map(x => x[3]), 
        searchObject)
      )
        this.doNext();
    }
  }

  _WebGLFindNonce(searchObject) {
    this._WebGLWriteBuffers(searchObject.states);
    this.context.run("init", this.buf, {n: "gr_offset", v: this.offset});
    requestAnimationFrame(() => this._WebGLSearch(searchObject));
  }
}
