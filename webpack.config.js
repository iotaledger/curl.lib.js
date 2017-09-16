const path = require('path');

module.exports = {
  entry: {
    example: './example/index.js',
    replay: './example/replay.js',
    curl: './src/curl.lib.js',
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        /*loader: 'babel-loader',
        query: {
          presets: ['es2015', "stage-0"]
        }
        */
      }
    ],
  },
  output: {
    path: __dirname + "/dist",
    publicPath: '/dist',
    filename: '[name].min.js',
    chunkFilename: '[id].bundle.js'
  }
};
