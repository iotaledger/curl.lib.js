'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _headers = require('./headers');

var _headers2 = _interopRequireDefault(_headers);

var _finalize = require('./finalize');

var _finalize2 = _interopRequireDefault(_finalize);

var _barrier = require('./barrier');

var _barrier2 = _interopRequireDefault(_barrier);

var _transform = require('./transform');

var _transform2 = _interopRequireDefault(_transform);

var _check = require('./check');

var check = _interopRequireWildcard(_check);

var _add = require('./add');

var _add2 = _interopRequireDefault(_add);

var _init = require('./init');

var _init2 = _interopRequireDefault(_init);

var _increment = require('./increment');

var _increment2 = _interopRequireDefault(_increment);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  init: _headers2.default + _add2.default + _init2.default,
  increment: _headers2.default + _add2.default + _increment2.default,
  transform: _headers2.default + _transform2.default,
  col_check: _headers2.default + check.col,
  check: _headers2.default + check.do_check + check.k_check,
  finalize: _headers2.default + check.do_check + _finalize2.default
};