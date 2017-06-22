
var WTKeyIndexContract = require('../build/contracts/WTKeyIndex.json');
var WTIndexContract = require('../build/contracts/WTIndex.json');
var WTHotelContract = require('../build/contracts/WTHotel.json');
var WTHotelUnitTypeContract = require('../build/contracts/WTHotelUnitType.json');
var PrivateCallContract = require('../build/contracts/PrivateCall.json');
var LifTokenContract = require('../build/contracts/LifToken.json');
var abiDecoder = require('abi-decoder');

var WTUser = function(){

  // ABI Decoder
  this.abiDecoder = abiDecoder;
  this.abiDecoder.addABI(PrivateCallContract.abi);
  this.abiDecoder.addABI(LifTokenContract.abi);
  this.abiDecoder.addABI(WTHotelContract.abi);
  this.abiDecoder.addABI(WTIndexContract.abi);
  this.abiDecoder.addABI(WTKeyIndexContract.abi);
  this.abiDecoder.addABI(WTHotelUnitTypeContract.abi);

  this.hexEncode = function(str){
    var hex, i;
    var result = "";
    for (i=0; i < str.length; i++) {
      hex = str.charCodeAt(i).toString(16);
      result += ("000"+hex).slice(-4);
    }
    return result;
  }

  this.hexDecode = function(str){
    var j;
    var hexes = str.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
      back += String.fromCharCode(parseInt(hexes[j], 16));
    }
    return back;
  }

};

module.exports = WTUser;
