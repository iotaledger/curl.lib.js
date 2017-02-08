# curl.lib.js
IOTA Proof-of-Work algorithm ported to Javascript to work in WebGL2-enabled browsers

## build

```
npm install
npm run build
```

## usage
----
```
var curl = require('curl.lib.js');
var trits = require('iota.lib.js/lib/crypto/converter').trits(myTryteString);
var minWeightMagnitude = 18;
curl.pow(trits, minWeightMagnitude)
    .then((hash) =>{
        //do something with trits. it has been modified now
        console.log(trits);
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
* to get the proof-of-work on a transaction 
    * `pow(<Array(8019)> transactionTrits, <int 0 >= i > 243 > minWeightMagnitude)` 
* to interrupt the currently running proof-of-work function
    * `interrupt(void)` 
* to continue the proof-of-work that you just interrupted
    * `resume(void)` 
* to remove the proof-of-work job that you had previously queued
    * `remove(void)` 

### To Do
----

- [ ] Find out some way to perform iterative loops on Fragment Shader when each step needs to know the output of the last from a separate index (i,e. hacked-together compute shader).

