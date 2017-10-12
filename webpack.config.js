const path = require("path")
var webpack = require("webpack")

module.exports = {
  entry: {
    example: "./example/index.js",
    curl: "./src/curl.lib.js"
  },
  devtool: "source-map",
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: "babel-loader",
        options: {
          presets: ["env"]
        }
      }
    ]
  },
  output: {
    path: __dirname + "/dist",
    publicPath: "/dist",
    filename: "[name].min.js",
    chunkFilename: "[id].bundle.js"
  },
  plugins: [new webpack.optimize.UglifyJsPlugin({ minimize: true })]
}
