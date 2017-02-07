import Turbo from './gl2c'
import searchInit, {transform} from './searchInit'
//import {k_init, headers, twistMain, barrier, twist, k_transform, increment, k_check, k_col_check} from './kernel'
import * as KRNL from './kernel'
import * as Const from './constants'
import * as Converter from "iota.lib.js/lib/crypto/converter"
import Curl from "iota.lib.js/lib/crypto/curl"

let MAXIMAGESIZE = 1e6;
let dim = {};
let texelSize = 4;

dim.x = Const.STATE_LENGTH+1;
let imageSize= Math.floor(MAXIMAGESIZE / dim.x / texelSize ) * dim.x * texelSize;//dim.x*texelSize*2;
dim.y = imageSize / dim.x / texelSize ;

var pack = (l) => (r,k,i) => (i%l ===0 ? r.push([k]): r[r.length-1].push(k)) && r;

export default class {
  constructor() {
    if(Turbo) {
      this.turbo = new Turbo(imageSize, dim);
      this.buf = this.turbo.ipt.data;
      this.turbo.addProgram("init", KRNL.k_init);
      this.turbo.addProgram("copy", KRNL.copy);
      this.turbo.addProgram("offset", KRNL.headers + KRNL.add + KRNL.offset);
      this.turbo.addProgram("increment", KRNL.headers + KRNL.add + KRNL.increment);
      this.turbo.addProgram("twist", KRNL.headers + KRNL.barrier + KRNL.twist + KRNL.twistMain);
      this.turbo.addProgram("check", KRNL.headers + KRNL.k_check);
      this.turbo.addProgram("col_check", KRNL.headers + KRNL.k_col_check);
      this.turbo.addProgram("finalize", KRNL.headers + KRNL.finalize);
      this.findNonce = this._turboFindNonce;
      this.state = "READY";
      this.queue = [];
    }
  }

  search(transactionTrits, minWeightMagnitude) {
    return new Promise((res, rej) => {
      if (transactionTrits.length != Const.TRANSACTION_LENGTH) rej(new Error("Incorrect Transaction Length"));
      else if(minWeightMagnitude >= Const.HASH_LENGTH || minWeightMagnitude <= 0) rej(new Error("Incorrect Min-Weight Magnitude"));
      else {
        var states = {
          low : new Int32Array(Const.STATE_LENGTH),
          high : new Int32Array(Const.STATE_LENGTH)
        };
        searchInit(states, transactionTrits);

        if(this.state == "SEARCHING") {
          this.queue.push({s: states, m: minWeightMagnitude, c: (hash) => res(hash)});
        } else {
          this.state = "SEARCHING";
          this.findNonce(states, minWeightMagnitude, (hash) => res(hash));
        }
      }
    });
  }

  _turboWriteBuffers(states) {
    for(var i = 0; i < Const.STATE_LENGTH; i++) {
      this.buf[i * texelSize] = states.low[i];
      this.buf[i * texelSize + 1] = states.high[i];
    }
  }

  _turboCheck() {
    var length = dim.x * texelSize;
    var index , nonce;
    this.buf[length-3] = this.mwm;
    this.turbo.run("check");
    this.buf = this.turbo.run("col_check");


    nonce = this.buf[length-1];
    index = nonce == 0? -1: this.buf[length-2];
    if(nonce != 0) {
      var dat = this.buf.reduce(pack(4), []).reduce(pack(dim.x), []);
      //console.log(dat[0].map(x => x[0]));
    }
    return {index, nonce};
  }

  _turboTransform() {
    var b;
    for(var i = 27; i-- > 0;) {
      b = this.turbo.run("twist")
        .reduce(pack(4), []).map(x => x[2]).reduce(pack(dim.x), []);
      console.log(i + "\t" + b[0].slice(0,27).join(", "));
      this.turbo.gl.finish();
    }
  }

  _turboSearch(callback) {
    this.turbo.run("increment");
    this.turbo.run("copy");
    this._turboTransform();

    var {index, nonce} = this._turboCheck();
    if(index === -1) {
      requestAnimationFrame(() => this._turboSearch(callback));
    } else {
      callback( this.turbo.run("finalize")
        .subarray(0, texelSize * Const.STATE_LENGTH)
        .reduce(pack(4), [])
        .map(x => x[3])
      );
      var next = this.queue.shift();
      if(next != null) {
          this.findNonce(next.s, next.m, next.c);
      } else {
        this.state = "READY";
      }
    }
  }

  _turboFindNonce(states, minWeightMagnitude, callback) {
    this._turboWriteBuffers(states);

    this.mwm = minWeightMagnitude;
    this.cb = callback;
    this.turbo.run("init", this.buf);
    this.turbo.run("offset");
    requestAnimationFrame(() => this._turboSearch(callback));
  }

}
