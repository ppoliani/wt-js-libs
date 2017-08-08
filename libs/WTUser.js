
var WTKey = require('./WTKey');
var WTWallet = require('./WTWallet');
var WTUtils = require('./WTUtils');
var WTKeyIndexContract = require('../build/contracts/WTKeyIndex.json');
var WTIndexContract = require('../build/contracts/WTIndex.json');
var HotelContract = require('../build/contracts/Hotel.json');
var UnitTypeContract = require('../build/contracts/UnitType.json');
var UnitContract = require('../build/contracts/Unit.json');
var PrivateCallContract = require('../build/contracts/PrivateCall.json');
var LifTokenContract = require('../build/contracts/LifToken.json');

const _ = require('lodash');

var WTUser = function(options){

  // Winding Tree key for encryption
  this.WTKey = new WTKey(options.keys || {});

  // Ethereum Wallet
  this.wallet = new WTWallet(options.wallet || {});

  this.web3 = this.wallet.web3;

  this.utils = WTUtils;

  this.hotels = options.hotels || {};
  this.indexAddress = options.indexAddress || '';
  this.wtIndex = options.indexAddress ? new WTIndexContract().at(options.indexAddress) : null;
  this.contracts = {
    WTIndex: WTIndexContract,
    WTKeyIndex: WTKeyIndexContract,
    Hotel: HotelContract,
    LifToken: LifTokenContract,
    HotelUnitType: UnitTypeContract,
    HotelUnit: UnitContract
  };

  this.setIndex = function(indexAddress){
    this.indexAddress = indexAddress;
    this.wtIndex = this.web3.eth.contract(this.contracts.WTIndex.abi).at(indexAddress);
  }

  // Update hotels information
  this.updateHotels = function(){
    this.hotelsAddrs = this.wtIndex.getHotels().splice(1);
    this.hotels = {};
    for (var i = 0; i < this.hotelsAddrs.length; i++)
      this.updateHotel(this.hotelsAddrs[i]);
    return this.hotels;
  }

  // Update hotel information
  this.updateHotel = function(hotelAddress){
    let wtHotel = this.web3.eth.contract(this.contracts.Hotel.abi).at(hotelAddress);
    let unitTypeNames = wtHotel.getUnitTypeNames();
    let unitTypes = [];
    let totalUnits = wtHotel.getChildsLength();
    let units = [];

    // Hotel images
    let hotelImages = [];
    for (var z = 0; z < wtHotel.getImagesLength(); z++)
      hotelImages.push(wtHotel.getImage(z));

    // Unit Types
    for (var i = 1; i < unitTypeNames.length; i++) {
      if (wtHotel.getUnitType(unitTypeNames[i]) != '0x0000000000000000000000000000000000000000'){
        let hotelUnitType = this.web3.eth.contract(this.contracts.HotelUnitType.abi).at(wtHotel.getUnitType(unitTypeNames[i]));
        let unitTypeInfo = hotelUnitType.getInfo();
        let hotelUnitAmenities = [];
        hotelUnitType.getAmenities(z).map(function(a ,i){
          if (parseInt(a) > 0) hotelUnitAmenities.push(parseInt(a));
        });
        let images = [];
        for (var z = 0; z < hotelUnitType.getImagesLength(); z++)
          images.push(hotelUnitType.getImage(z));
        unitTypes.push({
          type: this.web3.toAscii(unitTypeNames[i]).replace(/\W+/g, ""),
          index: z,
          description: unitTypeInfo[0],
          minGuests:  parseInt(unitTypeInfo[1]),
          maxGuests: parseInt(unitTypeInfo[2]),
          price: unitTypeInfo[3],
          active: unitTypeInfo[3],
          amenities: hotelUnitAmenities,
          images: images
        });
      }
    }

    // Hotel Units
    for (var i = 1; i < totalUnits; i++) {
      let unitAddress = wtHotel.childs.call(i);
      if (unitAddress != '0x0000000000000000000000000000000000000000'){
        let hotelUnit = this.web3.eth.contract(this.contracts.HotelUnit.abi).at(unitAddress);
        units.push({
          address: unitAddress,
          unitType: hotelUnit.unitType(),
          active: hotelUnit.active()
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
      images: hotelImages,
      unitTypes: unitTypes,
      units: units
    };
    return this.hotels[hotelAddress];
  }

  this.getBookings = function(){
    var self = this;
    var txs = self.wallet.getTxs();
    for (var i = 0; i < txs.length; i++)
      txs[i].decoded = self.utils.abiDecoder.decodeMethod(txs[i].input);
    txs = _.filter(txs, function(t){ return t.decoded});
    for (i = 0; i < txs.length; i++){
      let unitType = self.web3.eth.contract(self.contracts.HotelUnitType.abi).at(txs[i].to);
      txs[i].publicCall = self.utils.abiDecoder.decodeMethod(txs[i].decoded.params[0].value);
      txs[i].privateData = self.web3.toAscii(txs[i].decoded.params[1].value);
      txs[i].unitType = self.web3.toAscii( unitType.unitType() ).replace(/\W+/g, "");
      txs[i].hotelAddress = unitType.owner();
      txs[i].hotelName = self.web3.eth.contract(self.contracts.Hotel.abi).at(txs[i].hotelAddress).name();
      txs[i].accepted = true;
    }
    return txs;
  }

  this.bookUnit = async function(password, unitAddress, checkIn, nights, guestData){
    var self = this;

    // TODO: Add encryption to guest data.

    const privateData = this.web3.toHex(guestData);
    let hotelUnit = this.web3.eth.contract(this.contracts.HotelUnit.abi).at(unitAddress);
    let data = hotelUnit.book.getData(self.wallet.address, checkIn, nights);
    data = hotelUnit.beginCall.getData(data, privateData);
    let tx = await self.wallet.sendTx(password, {
      to: unitAddress,
      data: data,
      gasLimit: 4700000
    });
    const beginCalltx = await self.wallet.waitForTX(tx.transactionHash);
    const beginCallEvent = this.utils.abiDecoder.decodeLogs(beginCalltx.logs)[0];
    const pendingCallHash = beginCallEvent.events[1].value;
    const pendingCall = await hotelUnit.callsPending.call(beginCallEvent.events[1].value);
    return pendingCall;
  }

};

module.exports = WTUser;
