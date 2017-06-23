var webpack = require('webpack');
var path = require('path');
var WebpackBundleSizeAnalyzerPlugin = require('webpack-bundle-size-analyzer').WebpackBundleSizeAnalyzerPlugin;

module.exports = {

  devtool: "source-map",
  entry: "./libs/WTHotel.js",
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015']
        }
      }
    ]
  },
  output: {
    path: __dirname + "/dist/",
    filename: "WTHotel.min.js",
    library: "WTHotel",
    libraryTarget: "umd"
  },
  target: "node",
  plugins: [
    new WebpackBundleSizeAnalyzerPlugin('../build-stats.md')
  ]
};
