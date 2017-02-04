# curl.lib.js
IOTA Proof-of-Work algorithm ported to Javascript to work in WebGL2-enabled browsers
### To Do
----

- [x] `init` kernel that copies initial buffer down the image (there must be a better way)
- [x] `twist` kernel that does the meat of the transform function
- [ ] `offset` kernel that sets apart the search space (adder or incrementer?)
- [ ] webgl2 transform feedback for outputting / watching found/index variables
- [ ] re-use programs without re-compiling and linking
- [ ] delete programs when done to avoid overrunning memory
- [ ] possible memory blocking?
