# curl.lib.js
IOTA Proof-of-Work algorithm ported to Javascript to work in WebGL2-enabled browsers

## build

```
npm install
npm run build
```

### To Do
----

- [x] `init` kernel that copies initial buffer down the image (there must be a better way)
- [x] `twist` kernel that does the meat of the transform function
- [x] re-use programs without re-compiling and linking
- [ ] `offset` kernel that sets apart the search space (adder or incrementer?)
- [ ] webgl2 transform feedback for outputting / watching found/index variables
- [ ] delete programs when done to avoid overrunning memory
- [ ] possible memory blocking?
