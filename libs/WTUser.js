
var WTKey = require('./WTKey');
var WTWallet = require('./WTWallet');
var WTKeyIndexContract = require('../build/contracts/WTKeyIndex.json');
var WTIndexContract = require('../build/contracts/WTIndex.json');
var WTHotelContract = require('../build/contracts/WTHotel.json');
var WTHotelUnitTypeContract = require('../build/contracts/WTHotelUnitType.json');
var PrivateCallContract = require('../build/contracts/PrivateCall.json');
var LifTokenContract = require('../build/contracts/LifToken.json');

var WTUser = function(options){

  // Winding Tree key for encryption
  this.WTKey = new WTKey(options.keys || {});

  // Ethereum Wallet
  this.wallet = new WTWallet(options.wallet || {});

  this.web3 = this.wallet.web3;

  this.hotels = options.hotels || {};
  this.indexAddress = options.indexAddress || '';
  this.wtIndex = options.indexAddress ? new WTIndexContract().at(options.indexAddress) : null;
  this.contracts = {
    WTIndex: WTIndexContract,
    WTKeyIndex: WTKeyIndexContract,
    WTHotel: WTHotelContract,
    LifToken: LifTokenContract,
    WTHotelUnitType: WTHotelUnitTypeContract
  };

  this.setIndex = function(indexAddress){
    this.indexAddress = indexAddress;
    this.wtIndex = this.web3.eth.contract(this.contracts.WTIndex.abi).at(indexAddress);
  }

  // Update hotels information
  this.updateHotels = function(){
    let wtHotelAddresses = this.wtIndex.getHotels().splice(1);
    this.hotels = {};
    for (var i = 0; i < wtHotelAddresses.length; i++)
      this.updateHotel(wtHotelAddresses[i]);
    return this.hotels;
  }

  // Update hotel information
  this.updateHotel = function(hotelAddress){
    let wtHotel = this.web3.eth.contract(this.contracts.WTHotel.abi).at(hotelAddress);
    let unitTypeNames = wtHotel.getUnitTypeNames();
    let hotelUnits = [];
    for (var i = 1; i < unitTypeNames.length; i++) {
      let unitTypeAddress = wtHotel.getUnitType(unitTypeNames[i]);
      let hotelUnitType = this.web3.eth.contract(this.contracts.WTHotelUnitType.abi).at(unitTypeAddress);
      for (var z = 1; z < hotelUnitType.totalUnits(); z++) {
        let hotelUnit = hotelUnitType.units.call(z)
        hotelUnits.push({
          address: unitTypeAddress,
          type: this.web3.toAscii(unitTypeNames[i]).replace(/\W+/g, ""),
          index: z,
          name: hotelUnit[0],
          description: hotelUnit[1],
          minGuests:  parseInt(hotelUnit[2]),
          maxGuests: parseInt(hotelUnit[3]),
          price: hotelUnit[4],
          active: hotelUnit[5] ? 'Yes' : 'No'
        });
      }
    }
    this.hotels[hotelAddress] = {
      name: wtHotel.name(),
      description: wtHotel.description(),
      lineOne: wtHotel.lineOne(),
      lineTwo: wtHotel.lineTwo(),
      zip: wtHotel.zip(),
      country: wtHotel.country(),
      timezone: parseInt(wtHotel.timezone()),
      latitude: parseInt(wtHotel.latitude()),
      longitude: parseInt(wtHotel.longitude()),
      units: hotelUnits
    };
    return this.hotels[hotelAddress];
  }

  this.getBookings = function(){
    var self = this;
    var txs = self.wallet.getTxs();
    for (var i = 0; i < txs.length; i++)
      txs[i].decoded = self.abiDecoder.decodeMethod(txs[i].input);
    txs = _.filter(txs, function(t){ return t.decoded});
    for (i = 0; i < txs.length; i++){
      let unitType = self.web3.eth.contract(self.contracts.WTHotelUnitType.abi).at(txs[i].to);
      txs[i].publicCall = self.abiDecoder.decodeMethod(txs[i].decoded.params[0].value);
      txs[i].privateData = self.web3.toAscii(txs[i].decoded.params[1].value);
      txs[i].unitType = self.web3.toAscii( unitType.unitType() ).replace(/\W+/g, "");
      txs[i].unitName = unitType.units.call( parseInt(txs[i].publicCall.params[1].value) )[0];
      txs[i].hotelAddress = unitType.owner();
      txs[i].hotelName = self.web3.eth.contract(self.contracts.WTHotel.abi).at(txs[i].hotelAddress).name();
      txs[i].accepted = false;
    }
    return txs;
  }

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

  this.bookUnit = async function(password, unitAddress, index, checkIn, nights, guestData){
    var self = this;
    console.log("Booking with checkIn and nights:", checkIn, nights);
    const privateData = this.web3.toHex(JSON.stringify(guestData));
    let hotelUnitType = this.web3.eth.contract(this.contracts.WTHotelUnitType.abi).at(unitAddress);
    let data = hotelUnitType.book.getData(self.wallet.address, index, checkIn, nights);
    data = hotelUnitType.beginCall.getData(data, privateData);
    let tx = await self.wallet.sendTx(password, {
      to: unitAddress,
      data: data,
      gasLimit: 4700000
    });
    const beginCalltx = await self.wallet.waitForTX(tx.transactionHash);
    const beginCallEvent = abiDecoder.decodeLogs(beginCalltx.logs)[0];
    const pendingCallHash = beginCallEvent.events[1].value;
    const pendingCall = await hotelUnitType.callsPending.call(beginCallEvent.events[1].value);
    return pendingCall;
  }

};

module.exports = WTUser;
