import Turbo from './gl2c'
import searchInit, {transform} from './searchInit'
import {k_init, headers, twistMain, barrier, twist, k_transform, increment, k_check} from './kernel'
import * as Const from './constants'

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
      this.turbo.addProgram("init", k_init);
      this.turbo.addProgram("check", headers + k_check);
      this.turbo.addProgram("twist", headers + barrier + twist + twistMain);

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

    this.buf = this.turbo.run("init", this.buf);

    this._turboOffset();
    /*
    var diff = 0;
    for(var i = 0; i < (dim.x-1)*texelSize; i+=texelSize) {
      var j = i + dim.x*texelSize;
      var k = j + dim.x*texelSize;
      if(this.buf[j] != this.buf[k]) {
        diff = i/texelSize;
        console.log(diff);
      }
    }
    return;
    */
    requestAnimationFrame(() => this._turboSearch(callback));
  }

  _turboSearch(callback) {
    //var d = this.buf.reduce(pack(4), []).reduce(pack(dim.x), []).map(v => v[162][0]);
    console.log("next");
    for(var i = 0; i < dim.y; i++) {
      this._turboIncrement(Const.HASH_LENGTH /3 * 2, Const.HASH_LENGTH, i);
    }
    this._turboTransform();
    var {index, nonce} = this._turboCheck();
    if(index === -1) {
      requestAnimationFrame(() => this._turboSearch(callback));
    } else {
      var length = dim.x*texelSize;
      var start = length*index;
      var end = start + Const.HASH_LENGTH*texelSize;
      //console.log("index: " + index + " nonce: " + nonce);
      nonce &= 1 << (31-Math.clz32(nonce));
      console.log("index: " + index + " nonce: " + nonce);
      callback(
        this.buf
        .reduce(pack(4), []).reduce(pack(dim.x), [])[index]
        .slice(0,Const.HASH_LENGTH)
        .map( x => (x[0] & nonce == 0) ? 1 : ( (x[1] & nonce) == 0 ? -1 : 0))
      );
    }
  }

  _turboCheck() {
    var length = dim.x * texelSize;
    var index = -1, nonce;
    this.buf[length-3] = this.mwm;
    //this.turbo.run(this.buf, dim, headers + k_check);
    this.buf = this.turbo.run("check", this.buf);

    /*
    for(var i = 0; i < dim.y; i++) {
      var d = dat[i][dim.x-1][3];//this.buf[length*i-1];
      //console.log(d);
    }
    */
    for(var i = 0; i < dim.y; i++) {
      //index = i;
      var d = this.buf[length*(i+1)-1];//dat[i][dim.x-1][3];//
      //console.log(i+": "+d);
      nonce = d;
      
      if(nonce != 0 ) {//&& this._slowCheck(length, i)
        //nonce = this._slowCheck(length, i);
        //console.log(dat[i].slice(length*i + Const.HASH_LENGTH/3, length*i + (Const.HASH_LENGTH/3)*2).map(x => x[0]);
        
        index = i;
        return {index, nonce};
      }
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
      this.turbo.run("twist", this.buf);
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
/*
 *
        var dat = this.buf.reduce(pack(4), []).reduce(pack(dim.x), []);
        console.log(dat[i].slice(Const.HASH_LENGTH/3, Const.HASH_LENGTH*2/3)
          .map(x => x[0] & x[1] !== 0? 0 : (x[0] === 0 ? 1 : -1))
        );
        console.log(dat[i+1].slice(Const.HASH_LENGTH/3, Const.HASH_LENGTH*2/3)
          .map(x => x[0] & x[1] !== 0? 0 : (x[0] === 0 ? 1 : -1))
        );
        console.log(dat[i+2].slice(Const.HASH_LENGTH/3, Const.HASH_LENGTH*2/3)
          .map(x => x[0] & x[1] !== 0? 0 : (x[0] === 0 ? 1 : -1))
        );
        console.log(this.buf.slice(length*(i-1) - 8, (i-1)*length));
        console.log(this.buf.slice(length*i - 8, i*length));
        */
