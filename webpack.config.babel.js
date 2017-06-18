import path from 'path';

module.exports = {
  entry: {
    example: './example/index.js',
    //worker: './example/worker.js',
    curl: './src/index.js',
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
    path: __dirname + "/dist",
    publicPath: '/dist',
    filename: '[name].min.js',
    chunkFilename: '[id].bundle.js'
  }
};
