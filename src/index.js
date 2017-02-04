import turbo from './gl2c'
import PearlDiver from './search'

{
  var pearlDiver = new PearlDiver();
  var minWeightMagnitude = 4;
  var testTrits = new Int32Array(8019);
  for(var i=0; i < testTrits.length; i++) testTrits[i] = Math.floor(Math.random() * 3) - 1;
  var p1 = pearlDiver.search(testTrits, minWeightMagnitude);
  p1.then((hash) => {
    console.log("hashed");
    console.log(hash);
  }).catch((err) => {
    console.log("error occured");
    console.log(err);
  });
}

/*
var prog = 
  `void main(void) { 
    init();
    //ivec4 tex = texelFetch(u_texture, coord, 0);
    ivec4 tex = read();
    tex.g = my_coord.x;
    tex.b = my_coord.y;
    tex.a = textureSize(u_texture, 0).y;//int(size.y);
    tex.r = read_at(ivec2(0,0)).r + 10;
    commit(tex);
    //color = tex & 299;//ivec4(tex + texelFetch(u_texture, ivec2(0,0),0));
    //i &= 0xF;
    //commit(read() * 4.);
    //color = vec4(i + (coord.x + coord.y));//tex * 9.;
    //color = tex ^ 0x7BCDFF90;//tex;//ivec4(tex + texelFetch(u_texture, ivec2(0,0),0));
  }`;

if(turbo) {
  var blah = turbo.alloc(1e6);
  var dim = {};
  dim.x = 729;
  dim.y = (blah.length / dim.x) / 4;
  console.log("test 2");
  var x = 0xABCDEF90;
  console.log(x);
  blah.data[0] = 0xABCDEF90;//Math.pow(2,6) - i; 
  for (var i = 0; i <= blah.data.length; i++) blah.data[i] = Math.floor(Math.random()*100);//0xFFFFFFFF;//Math.pow(2,6) - i; 
  console.log(blah.data.slice(0,10)); 
  //setTimeout(() => {
  for(var i = 0; i < 1e1; i++) {
    turbo.run(blah, dim, prog);
  }
  console.log(blah.data.slice(0,10)); 
  //}, 200)
}
*/
