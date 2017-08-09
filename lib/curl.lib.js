"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pearldiver = require("./pearldiver");

var _pearldiver2 = _interopRequireDefault(_pearldiver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var pdInstance = new _pearldiver2.default();

var pow = function pow(options, success, error) {
  var state = void 0;
  if (options.trytes == null) {
    state = pdInstance.offsetState(options.state);
    console.log("offset states");
  } else if (options.state == null) {
    state = pdInstance.prepare(options.trytes);
    console.log("prepared trytes");
  } else {
    error("Error: no trytes or state matrix provided");
  }
  var powPromise = pdInstance.search(state, options.minWeight);
  if (typeof success === 'function') {
    powPromise.then(success).catch(error);
  }
  return powPromise;
};

var overrideAttachToTangle = function overrideAttachToTangle(api) {
  api.attachToTangle = function (trunkTransaction, branchTransaction, minWeight, trytesArray, callback) {
    var _this = this;

    var check = function () {
      var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(txTrytes) {
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt("return", new Promise(function (resolve, reject) {
                  var trytes = txTrytes.substr(0, txTrytes.length - 81 * 3).concat(trunkTransaction).concat(branchTransaction);
                  pow({ trytes: trytes, minWeight: minWeight }).then(function (nonce) {
                    resolve(trytes.concat(nonce));
                  });
                }));

              case 1:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, _this);
      }));

      return function check(_x) {
        return _ref.apply(this, arguments);
      };
    }();
    _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
      var trytes, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, txTrytes, result;

      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              trytes = [];
              _iteratorNormalCompletion = true;
              _didIteratorError = false;
              _iteratorError = undefined;
              _context2.prev = 4;
              _iterator = trytesArray[Symbol.iterator]();

            case 6:
              if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                _context2.next = 16;
                break;
              }

              txTrytes = _step.value;
              _context2.next = 10;
              return check(txTrytes);

            case 10:
              result = _context2.sent;

              console.log('got PoW! ' + result);
              trytes.push(result);

            case 13:
              _iteratorNormalCompletion = true;
              _context2.next = 6;
              break;

            case 16:
              _context2.next = 22;
              break;

            case 18:
              _context2.prev = 18;
              _context2.t0 = _context2["catch"](4);
              _didIteratorError = true;
              _iteratorError = _context2.t0;

            case 22:
              _context2.prev = 22;
              _context2.prev = 23;

              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }

            case 25:
              _context2.prev = 25;

              if (!_didIteratorError) {
                _context2.next = 28;
                break;
              }

              throw _iteratorError;

            case 28:
              return _context2.finish(25);

            case 29:
              return _context2.finish(22);

            case 30:
              callback(null, trytes);

            case 31:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, _this, [[4, 18, 22, 30], [23,, 25, 29]]);
    }))();
  };
};

exports.default = {
  pow: pow,
  prepare: function prepare(trytes) {
    pdInstance.prepare(trytes);
  },
  setOffset: function setOffset(o) {
    return pdInstance.setOffset(o);
  },
  interrupt: function interrupt() {
    return pdInstance.interrupt();
  },
  resume: function resume() {
    return pdInstance.doNext();
  },
  remove: function remove() {
    return pdInstance.queue.unshift();
  },
  getHashRows: function getHashRows(c) {
    return c(pdInstance.getHashCount());
  },
  overrideAttachToTangle: overrideAttachToTangle
};