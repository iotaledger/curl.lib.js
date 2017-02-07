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
      this.turbo.addProgram("offset", KRNL.headers + KRNL.add + KRNL.offset);
      this.turbo.addProgram("twist", KRNL.headers + KRNL.barrier + KRNL.twist + KRNL.twistMain);
      this.turbo.addProgram("check", KRNL.headers + KRNL.k_check);
      this.turbo.addProgram("col_check", KRNL.headers + KRNL.k_col_check);
      this.turbo.addProgram("finalize", KRNL.headers + KRNL.finalize);
      this.findNonce = this._turboFindNonce;
      this.state = "READY";
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

        this.findNonce(states, minWeightMagnitude, (hash) => res(hash));
      }
    });
  }

  _turboFindNonce(states, minWeightMagnitude, callback) {
    this._turboWriteBuffers(states);

    this.mwm = minWeightMagnitude;
    this.cb = callback;

    //this.buf = this.turbo.run("init", this.buf);
    this.turbo.run("init", this.buf);
    /*
    console.log(this.buf.reduce(pack(4), []).map(x=> x[0] == 0? 1: x[1] == 0? -1: 0).reduce(pack(dim.x), [])[0].slice(81,100));
    console.log(this.buf.reduce(pack(4), []).map(x=> x[0] == 0? 1: x[1] == 0? -1: 0).reduce(pack(dim.x), [])[1].slice(81,100));
    */
    var b = this.buf.reduce(pack(4), []).map(x=> x[0] == 0? 1: x[1] == 0? -1: 0).reduce(pack(dim.x), [])
    console.log(b[0].slice(81,91));
    this.buf = this.turbo.run("offset");
    var b = this.buf.reduce(pack(4), []).map(x=> x[2] == 0? 1: x[3] == 0? -1: 0).reduce(pack(dim.x), [])
    //var d = this.buf.reduce(pack(4), []).map(x=> x[2]).reduce(pack(dim.x), [])
    for(var i = 0; i < 27; i++) {
      console.log(b[i].slice(81,101).join(" "));
    }

    //requestAnimationFrame(() => this._turboSearch(callback));
  }

  _turboSearch(callback) {
    console.log("next");
    for(var i = 0; i < dim.y; i++) {
      this._turboIncrement(Const.HASH_LENGTH /3 * 2, Const.HASH_LENGTH, i);
    }
    
    var dat = this.buf.reduce(pack(4), []).reduce(pack(dim.x), [])[0];
    window.x0 = dat.map(x=>x[0]);
    window.x1 = dat.map(x=>x[1]);
    window.x2 = dat.map(x=>x[2]);
    window.x3 = dat.map(x=>x[3]);
    this._turboTransform();
    //console.log(dat.map(x=>x[3]))
    //console.log(this.buf.reduce(pack(4), []).map(x=>x[3]).reduce(pack(dim.x), [])[0]);
    //return;

    var {index, nonce} = this._turboCheck();

    if(index === -1) {
      requestAnimationFrame(() => this._turboSearch(callback));
    } else {
      callback( this.turbo.run("finalize", this.buf)
        .subarray(0, texelSize * Const.STATE_LENGTH)
        .reduce(pack(4), [])
        .map(x => x[3])
      );
    }
  }

  _turboCheck() {
    var length = dim.x * texelSize;
    var index , nonce;
    this.buf[length-3] = this.mwm;
    //this.turbo.run(this.buf, dim, headers + k_check);
    this.buf = this.turbo.run("check", this.buf);
    this.buf = this.turbo.run("col_check", this.buf);

    /*
    for(var i = 0; i < dim.y; i++) {
      var d = dat[i][dim.x-1][3];//this.buf[length*i-1];
      //console.log(d);
    }
    */

    nonce = this.buf[length-1];
    index = nonce == 0? -1: this.buf[length-2];
    /*
    nonce = dat[0][729][3];//this.buf[729*4+2];
    */
    if(nonce != 0) {
      var dat = this.buf.reduce(pack(4), []).reduce(pack(dim.x), []);
      console.log(dat[0].map(x => x[0]));
    }
    return {index, nonce};
  }

  _slowCheck(len, y) {
    var lastMeasurement = 0xFFFFFFFF;
    for (var i = this.mwm; i-- > 0; ) {
      lastMeasurement &= ~(
        this.buf[len*y + (Const.HASH_LENGTH - 1 - i) * texelSize + 2] ^
        this.buf[len*y + (Const.HASH_LENGTH - 1 - i) * texelSize + 3]);
      if (lastMeasurement == 0) {
      return 0;
      }
    }
    return lastMeasurement;
  }

  _turboOffset() {
    for(var i = 1; i < dim.y; i++) {
      for(var j = 0; j < i; j++) {
        this._turboIncrement(Const.HASH_LENGTH/3, 2 * Const.HASH_LENGTH / 3, i * dim.x);
      }
      //console.log("offset at: " +i + " done " + j+" times.");
    }
  }

  _turboIncrement(from, to, row) {
    for(var i = from; i < to; i++) {
      if (this.buf[(i + row)* texelSize] == 0) {
        this.buf[(i + row)* texelSize] = 0xFFFFFFFF;
        this.buf[(i + row)* texelSize + 1] = 0;
      }
      else {
        if (this.buf[(i + row)* texelSize + 1] == 0) {
          this.buf[(i + row)* texelSize + 1] = 0xFFFFFFFF;
        }
        else {
          this.buf[(i + row)* texelSize] = 0;
        }
        break;
      }
    }
    //this.turbo.run(this.buf, dim, headers + increment);
  }
  _turboTransform() {
    //this.turbo.run(this.buf, dim, headers + barrier + twist + twistMain, false);
    for(var i = 0; i < 27; i++) {
      this.buf = this.turbo.run("twist", this.buf);
      this.turbo.gl.finish();
    }
  }
  _turboWriteBuffers(states) {
    for(var i = 0; i < Const.STATE_LENGTH; i++) {
      this.buf[i * texelSize] = states.low[i];
      this.buf[i * texelSize + 1] = states.high[i];
      this.buf[i * texelSize + 2] = states.low[i];
      this.buf[i * texelSize + 3] = states.high[i];
    }
  }
}
