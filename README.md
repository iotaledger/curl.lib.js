# curl.lib.js
IOTA Proof-of-Work algorithm ported to Javascript to work in WebGL2-enabled browsers

## build

```
npm install
npm run compile
```

## usage

An example of the usage of curl.lib.js:

```
var curl = require('curl.lib.js');
var minWeight = 18;
curl.pow({trytes: myTryteString, minWeight})
    .then((nonce) =>{
        console.log(myTryteString.substr(0, 2187-81).concat(nonce));
    }).catch((error) => {
        /*
         woops. 
            maybe your trits were bad, 
            or your minWeightMagnitude was bad.
         Perhaps you need to take a long introspection,
         or just
         */
         console.log(error);
    });
```

Available functions:
* `pow({trytes, minWeight})` 
    * gets the proof-of-work on a transaction 
    * possible errors:
        * Webgl2 wasn't available
        * Transaction Trits were wrong length
        * Min Weight Magnitude was greater than Hash length (243)
* `setOffset(offset<int >0>)`
    * sets an offset to start pow search from
    * useful for amortized proof of work
* `getHashCount()`
    * returns the number of concurrent hash rows copmleted by this worker
* `interrupt(void)` 
    * interrupts the currently running proof-of-work function
* `resume(void)` 
    * continues the proof-of-work that you just interrupted
* `remove(void)` 
    * removes the proof-of-work job that you had previously queued
* `overrideAttachToTangle(api)`
    * overrides attachToTangle for iota.lib.js api object

### In Browser

Include `dist/curl.min.js` in your browser, and you'll find the `curl` object 
available in the window space.

### To Do
----

- [ ] Improve speed
    - [ ] Find out some way to perform iterative loops on Fragment Shader when each step needs to know the output of the last from a separate index (i,e. hacked-together compute shader).
