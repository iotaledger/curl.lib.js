import PearlDiver from './pearldiver'

let pdInstance = new PearlDiver();

self.onmessage = (e) => {
  e = JSON.parse(e);
  switch(e.cmd) {
    case 'pow': 
      pdInstance.search(e.trytes, e.minWeight)
        .then((trytes) => self.postMessage(JSON.stringify({cmd: 'pow', id: e.id, trytes})))
        .catch((err) => self.postMessage(JSON.stringify({err})));
      break;
    case 'setOffset':
      pdInstance.setOffset(e.offset);
      break;
    case 'interrupt':
      pdInstance.interrupt();
      break;
    case 'resume':
      pdInstance.doNext();
      break;
    case 'remove':
      pdInstance.queue.unshift();
      break;
    case 'getHashRows':
      self.postMessage(JSON.stringify({cmd:'getHashCount', rows: pdInstance.getHashCount()}));
      break;
  }
}
export default {
  pow: (trytes, minWeight, callback, error) => {
    var powPromise = pdInstance.search(trytes, minWeight)
    if(typeof callback === 'function') {
      powPromise.then(callback).catch(error)
    }
    return powPromise;
  },
  setOffset: (o) => pdInstance.setOffset(o),
  interrupt: () => pdInstance.interrupt(),
  resume: () => pdInstance.doNext(),
  remove: () => pdInstance.queue.unshift(),
  getHashRows: (c) => c(pdInstance.getHashCount()),
}
