import path from 'path';

module.exports = {
  entry: {
    index: './src/index.js'
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
    publicPath: '/',
    filename: '[name].bundle.js',
    chunkFilename: '[id].bundle.js'
  }
};
