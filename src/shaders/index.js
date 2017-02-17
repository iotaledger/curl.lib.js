import headers    from './headers'
import finalize   from './finalize'
import barrier    from './barrier'
import twist      from './transform'
import * as check from './check'
import add        from './add'
import init       from './init'
import increment  from './increment'

export default {
  init      : headers + add + init,
  increment : headers + add + increment,
  transform : headers + twist,
  col_check : headers + check.col,
  check     : headers + check.do_check + check.k_check,
  finalize  : headers + check.do_check + finalize,
}
