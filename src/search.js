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

var s0 = 0;
var t0 = 0;
dim.x = Const.STATE_LENGTH+1;
let imageSize= Math.floor(MAXIMAGESIZE / dim.x / texelSize ) * dim.x * texelSize;//dim.x*texelSize*2;
dim.y = imageSize / dim.x / texelSize ;

var pack = (l) => (r,k,i) => (i%l ===0 ? r.push([k]): r[r.length-1].push(k)) && r;

export default class {
  constructor() {
    if(Turbo) {
      this.turbo = new Turbo(imageSize, dim);
      this.buf = this.turbo.ipt.data;
      this.turbo.addProgram("init", KRNL.headers + KRNL.add + KRNL.offset + KRNL.k_init);
      this.turbo.addProgram("increment", KRNL.headers + KRNL.add + KRNL.increment);
      this.turbo.addProgram("twist", KRNL.headers + KRNL.barrier + KRNL.twist + KRNL.twistMain);
      this.turbo.addProgram("check", KRNL.headers + KRNL.k_check, "minWeightMagnitude");
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
          this.findNonce(states, minWeightMagnitude, (hash) => {
            transactionTrits.splice(
              Const.TRANSACTION_LENGTH-Const.HASH_LENGTH,
              Const.HASH_LENGTH,
              hash);
            res(hash);
          });
        }
      }
    });
  }

  doNext() {
    var next = this.queue.shift();
    if(next != null) {
      this.findNonce(next.s, next.m, next.c);
    } else {
      this.state = "READY";
    }
  }

  _turboWriteBuffers(states) {
    for(var i = 0; i < Const.STATE_LENGTH; i++) {
      this.buf[i * texelSize] = states.low[i];
      this.buf[i * texelSize + 1] = states.high[i];
    }
  }


  _turboSearch(callback) {
    //console.log("next");
    var s1, s2;
    this.turbo.run("increment");
    if(t0 == 0) {console.log("increment " + (Date.now()-s0)/1e3); s0 = Date.now();}
    var b;
    for(var i = 27; i-- > 0;) {
      b = this.turbo.run("twist");
      /*
      if(t0 == 1) {
        console.log("different count on " + i + ": " + b
          .reduce(pack(4), [])
          .reduce(pack(dim.x), [])[0]
          .slice(0,dim.x-1)
          //.map(x => x[2])
          .filter((v,id) => v[2] - t[1][26-i][id] != 0)
          .length
        );
      }
      */
    }
    //if(t0 == 1) t0++;
    if(t0 == 0) {console.log("transform " + (Date.now()-s0)/1e3); s0 = Date.now();}
    this._turboNext(callback);
  }

  _turboNext(callback) {
    var b = this.turbo.run("check", null, {n:"minWeightMagnitude", v: this.mwm});
    if(t0 == 0) {console.log("check " + (Date.now()-s0)/1e3); s0 = Date.now(); t0 = 1;}
    if(this.turbo.run("col_check")[dim.x * texelSize - 2] === -1) {
      requestAnimationFrame(() => this._turboSearch(callback));
    } else {
      this._turboFinish(callback);
      this.doNext();
    }
  }

  _turboFinish(callback) {
    callback( this.turbo.run("finalize")
      .subarray(0, texelSize * Const.HASH_LENGTH)
      .reduce(pack(4), [])
      .map(x => x[3])
    );
  }

  _turboFindNonce(states, minWeightMagnitude, callback) {
    this._turboWriteBuffers(states);

    this.mwm = minWeightMagnitude;
    this.cb = callback;
    if(t0 == 0) s0 = Date.now();
    this.turbo.run("init", this.buf);
    if(t0 == 0) {console.log("init " + (Date.now()-s0)/1e3); s0 = Date.now();}
    requestAnimationFrame(() => this._turboSearch(callback));
  }
}
