var webpack = require('webpack');
var path = require('path');
var WebpackBundleSizeAnalyzerPlugin = require('webpack-bundle-size-analyzer').WebpackBundleSizeAnalyzerPlugin;

module.exports = {
  devtool: "source-map",
  entry: {
    BookingData: "./libs/BookingData.js",
    HotelManager: "./libs/HotelManager.js",
    User: "./libs/User.js"
  },
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
    path: __dirname + "/dist/web/",
    filename: '[name].js',
    library: '[name]',
    libraryTarget: "umd"
  },
  target: "web",
  plugins: [
    // new WebpackBundleSizeAnalyzerPlugin('../build-stats.md'),
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require('./package.json').version)
    })
  ]
};
