const headers    = require( './headers');
const finalize   = require( './finalize');
const barrier    = require( './barrier');
const twist      = require( './transform');
const check      = require( './check');
const add        = require( './add');
const init       = require( './init');
const increment  = require( './increment');

module.exports = {
  init      : headers + add + init,
  increment : headers + add + increment,
  transform : headers + twist,
  col_check : headers + check.col,
  check     : headers + check.do_check + check.k_check,
  finalize  : headers + check.do_check + finalize,
}
