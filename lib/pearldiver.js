'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _converter = require('iota.lib.js/lib/crypto/converter');

var _WebGL = require('./WebGL');

var _WebGL2 = _interopRequireDefault(_WebGL);

var _searchInit = require('./searchInit');

var _searchInit2 = _interopRequireDefault(_searchInit);

var _shaders = require('./shaders');

var _shaders2 = _interopRequireDefault(_shaders);

var _constants = require('./constants');

var Const = _interopRequireWildcard(_constants);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MAXIMAGESIZE = Math.pow(document.createElement('canvas').getContext('webgl2').MAX_TEXTURE_SIZE, 2) * 0.50; //was 1e6;
var dim = {};
var texelSize = 4;

dim.x = Const.STATE_LENGTH + 1;
var imageSize = Math.floor(MAXIMAGESIZE / dim.x / texelSize) * dim.x * texelSize; //dim.x*texelSize*2;
dim.y = imageSize / dim.x / texelSize;

var pack = function pack(l) {
  return function (r, k, i) {
    return (i % l === 0 ? r.push([k]) : r[r.length - 1].push(k)) && r;
  };
};
var inn = 0;

function pearlDiverCallback(res, transactionTrits, minWeightMagnitude, m_self) {
  return function (nonce, searchObject) {
    //res(trytes([...transactionTrits.slice(0,Const.TRANSACTION_LENGTH-Const.HASH_LENGTH), ...nonce]));
    res((0, _converter.trytes)(nonce));
  };
}

var PearlDiver = function () {
  function PearlDiver(offset) {
    _classCallCheck(this, PearlDiver);

    if (_WebGL2.default) {
      this.offset = dim.y * (offset || 0);
      this.context = new _WebGL2.default(imageSize, dim);
      this.buf = this.context.ipt.data;
      this.context.addProgram("init", _shaders2.default.init, "gr_offset");
      this.context.addProgram("increment", _shaders2.default.increment);
      this.context.addProgram("twist", _shaders2.default.transform);
      this.context.addProgram("check", _shaders2.default.check, "minWeightMagnitude");
      this.context.addProgram("col_check", _shaders2.default.col_check);
      this.context.addProgram("finalize", _shaders2.default.finalize);
      this.findNonce = this._WebGLFindNonce;
      this.state = "READY";
      this.queue = [];
    }
  }

  _createClass(PearlDiver, [{
    key: 'getHashCount',
    value: function getHashCount() {
      return dim.y;
    }
  }, {
    key: 'setOffset',
    value: function setOffset(o) {
      this.offset = o;
    }
  }, {
    key: 'offsetState',
    value: function offsetState(state) {
      return (0, _searchInit.toPair)(state);
    }
  }, {
    key: 'prepare',
    value: function prepare(transactionTrytes, minWeightMagnitude) {
      var transactionTrits = (0, _converter.trits)(transactionTrytes);
      if (transactionTrits.length < Const.TRANSACTION_LENGTH - Const.HASH_LENGTH) return null;
      var states = {
        low: new Int32Array(Const.STATE_LENGTH),
        high: new Int32Array(Const.STATE_LENGTH)
      };
      (0, _searchInit2.default)(states, transactionTrits);
      return states;
    }
  }, {
    key: 'searchWithCallback',
    value: function searchWithCallback(transactionTrytes, minWeightMagnitude, callback, err) {
      var states = this.prepare(transactionTrytes, minWeightMagnitude);
      this.search(states, minWeightMagnitude).then(callback).catch(err);
    }
  }, {
    key: 'search',
    value: function search(states, minWeight) {
      var _this = this;

      return new Promise(function (res, rej) {
        if (_this.context == null) rej(new Error("Webgl2 Is not Available"));else if (minWeight >= Const.HASH_LENGTH || minWeight <= 0) rej(new Error("Bad Min-Weight Magnitude"));
        //setupSearch(states, minWeight);

        _this.queue.push({
          states: states,
          mwm: minWeight,
          call: pearlDiverCallback(res, states, minWeight, _this)
        });
        console.log("starting!");
        if (_this.state == "READY") _this.doNext();
      });
    }
  }, {
    key: 'interrupt',
    value: function interrupt() {
      if (this.state == "SEARCHING") this.state = "INTERRUPTED";
    }
  }, {
    key: 'doNext',
    value: function doNext() {
      var next = this.queue.shift();
      if (this.state != "SEARCHING") {
        if (next != null) {
          this.state = "SEARCHING";
          this.findNonce(next);
        }
      } else {
        this.state = "READY";
      }
    }
  }, {
    key: '_save',
    value: function _save(searchObject) {
      this.buf.reduce(pack(4), []).slice(0, Const.STATE_LENGTH).reduce(function (a, v) {
        return a.map(function (c, i) {
          return c.push(v[i]);
        }) && a;
      }, [[], []]).reduce(function (a, v, i) {
        return (i % 2 ? a.set("high", v) : a.set("low", v)) && a;
      }, new Map()).forEach(function (v, k) {
        return searchObject.states[k] = v;
      });
      this.queue.unshift(searchObject);
    }
  }, {
    key: '_WebGLWriteBuffers',
    value: function _WebGLWriteBuffers(states) {
      for (var i = 0; i < Const.STATE_LENGTH; i++) {
        this.buf[i * texelSize] = states.low[i];
        this.buf[i * texelSize + 1] = states.high[i];
        this.buf[i * texelSize + 2] = states.low[i];
        this.buf[i * texelSize + 3] = states.high[i];
      }
    }
  }, {
    key: '_WebGLSearch',
    value: function _WebGLSearch(searchObject) {
      var _this2 = this;

      this.context.run("increment");
      this.context.run("twist", 27);
      this.context.run("check", 1, { n: "minWeightMagnitude", v: searchObject.mwm });
      this.context.run("col_check");
      if (this.context.readData(0, 0, dim.x, dim.y)[dim.x * texelSize - 2] === -1) {
        if (this.state == "INTERRUPTED") return this._save(searchObject);
        //requestAnimationFrame(() => this._WebGLSearch(searchObject));
        setTimeout(function () {
          return _this2._WebGLSearch(searchObject);
        }, 1);
      } else {
        this.context.run("finalize");
        searchObject.call(this.context.readData().reduce(pack(4), []).slice(0, Const.HASH_LENGTH).map(function (x) {
          return x[3];
        }), searchObject);
        this.doNext();
      }
    }
  }, {
    key: '_WebGLFindNonce',
    value: function _WebGLFindNonce(searchObject) {
      var _this3 = this;

      this._WebGLWriteBuffers(searchObject.states);
      this.context.writeData(this.buf);
      this.context.run("init", 1, { n: "gr_offset", v: this.offset });
      //requestAnimationFrame(() => this._WebGLSearch(searchObject));
      setTimeout(function () {
        return _this3._WebGLSearch(searchObject);
      }, 1);
    }
  }]);

  return PearlDiver;
}();

exports.default = PearlDiver;