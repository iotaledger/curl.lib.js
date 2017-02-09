import PearlDiver from './pearldiver'

window.PearlDiver = PearlDiver;
var pdInstance = [new PearlDiver()];

export default {
  addInstance: (num) => Array.prototype.push.apply(pdInstance, new Array(num).fill(undefined).map(x => new PearlDiver())),
  getInstances: () => pdInstance,
  pow: (t,m) => pdInstance[0].search(t,m),
  interrupt: () => pdInstance[0].interrupt(),
  resume: () => pdInstance[0].doNext(),
  remove: () => pdInstance[0].queue.unshift()
}
