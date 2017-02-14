import path from 'path';

module.exports = {
  entry: {
    //index: './example/index.js'
    index: './src/curl.lib.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015']
        }
      }
    ],
  },
  output: {
    path: __dirname,
    publicPath: '/dist',
    filename: '[name].min.js',
    chunkFilename: '[id].bundle.js'
  }
};
