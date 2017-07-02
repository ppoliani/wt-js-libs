
var WTKeyIndexContract = require('../build/contracts/WTKeyIndex.json');
var WTIndexContract = require('../build/contracts/WTIndex.json');
var WTHotelContract = require('../build/contracts/WTHotel.json');
var WTHotelUnitTypeContract = require('../build/contracts/WTHotelUnitType.json');
var PrivateCallContract = require('../build/contracts/PrivateCall.json');
var LifTokenContract = require('../build/contracts/LifToken.json');
var abiDecoder = require('abi-decoder');
var moment = require('moment');

var WTUtils = {}

// ABI Decoder
WTUtils.abiDecoder = abiDecoder;
WTUtils.abiDecoder.addABI(PrivateCallContract.abi);
WTUtils.abiDecoder.addABI(LifTokenContract.abi);
WTUtils.abiDecoder.addABI(WTHotelContract.abi);
WTUtils.abiDecoder.addABI(WTIndexContract.abi);
WTUtils.abiDecoder.addABI(WTKeyIndexContract.abi);
WTUtils.abiDecoder.addABI(WTHotelUnitTypeContract.abi);

WTUtils.hexEncode = function(str){
  var hex, i;
  var result = "";
  for (i=0; i < str.length; i++) {
    hex = str.charCodeAt(i).toString(16);
    result += ("000"+hex).slice(-4);
  }
  return result;
}

WTUtils.hexDecode = function(str){
  var j;
  var hexes = str.match(/.{1,4}/g) || [];
  var back = "";
  for(j = 0; j<hexes.length; j++) {
    back += String.fromCharCode(parseInt(hexes[j], 16));
  }
  return back;
}

// Returns the date from a single integer in format DD/MM/YYYY
WTUtils.parseDate = function(date){
  return moment([1970, 0, 1]).add(date, 'days').format('L');
}

// Returns the date formated in a single integer
WTUtils.formatDate = function(date){
  moment(date).diff(moment([1970, 0, 1]), 'days');
}

// W -180 <--- 0 ---> 180 E
// -3.703578 or 3.703578 W == (180 + (-3.703578))*10^5 == 17629642
WTUtils.parseLatitude = function(lat){
  return parseInt((180+lat)*1000000);
}

WTUtils.formatLatitude = function(lat){
  return parseFloat((lat/1000000)-180).toFixed(5);
}

// S -90 <--- 0 ---> 90 N
// 40.426371 or 40.426371 N == (90 + 40.426371)*10^5 == 13042637
WTUtils.parseLongitude = function(long){
  return parseInt((90+long)*1000000);
}

WTUtils.formatLongitude = function(long){
  return parseFloat((long/1000000)-90).toFixed(5);
}

module.exports = WTUtils;
