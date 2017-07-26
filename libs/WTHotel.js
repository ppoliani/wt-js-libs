
var WTKey = require('./WTKey');
var WTWallet = require('./WTWallet');
var WTUtils = require('./WTUtils');
var WTKeyIndexContract = require('../build/contracts/WTKeyIndex.json');
var WTIndexContract = require('../build/contracts/WTIndex.json');
var HotelContract = require('../build/contracts/Hotel.json');
var UnitTypeContract = require('../build/contracts/UnitType.json');
var PrivateCallContract = require('../build/contracts/PrivateCall.json');
var LifTokenContract = require('../build/contracts/LifToken.json');

const util = require('ethereumjs-util');

var Hotel = function(options){

  // Winding Tree key for encryption
  this.WTKey = new WTKey(options.keys || {});

  // Ethereum Wallet
  this.wallet = new WTWallet(options.wallet || {});

  this.utils = WTUtils;

  this.web3 = this.wallet.web3;

  this.hotels = options.hotels || {};
  this.indexAddress = options.indexAddress || '';
  this.wtIndex = options.indexAddress ? new WTIndexContract().at(options.indexAddress) : null;
  this.contracts = {
    WTIndex: WTIndexContract,
    WTKeyIndex: WTKeyIndexContract,
    Hotel: HotelContract,
    LifToken: LifTokenContract,
    HotelUnitType: UnitTypeContract
  };

  this.setIndex = function(indexAddress){
    this.indexAddress = indexAddress;
    this.wtIndex = this.web3.eth.contract(this.contracts.WTIndex.abi).at(indexAddress);
  }

  // Update hotels information
  this.updateHotels = function(){
    this.hotelsAddrs = this.wtIndex.getHotelsByOwner(this.wallet.address);
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
    for (var i = 1; i < unitTypeNames.length; i++) {
      if (wtHotel.getUnitType(unitTypeNames[i]) != '0x0000000000000000000000000000000000000000'){
        let hotelUnitType = this.web3.eth.contract(this.contracts.HotelUnitType.abi).at(wtHotel.getUnitType(unitTypeNames[i]));
        let unitTypeInfo = hotelUnitType.getInfo();
        let hotelUnitAmenities = [];
        hotelUnitType.getAmenities(z).map(function(a ,i){
          if (parseInt(a) > 0) hotelUnitAmenities.push(parseInt(a));
        });
        let units = [];
        let images = [];
        for (var z = 1; z <= hotelUnitType.totalUnits(); z++)
          units.push({
            active: hotelUnitType.getUnit(z)
          });
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
          units: units,
          images: images
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
      unitTypes: unitTypes
    };
    return this.hotels[hotelAddress];
  }

  // Create a hotel contract
  this.createHotel = async function(password, name, description){
    var self = this;
    const data = self.wtIndex.registerHotel.getData(name, description, {from: self.wallet.address});
    let tx = await self.wallet.sendTx(password, {
      to: self.wtIndex.address,
      data: data,
      gasLimit: 4700000
    });
    await self.wallet.waitForTX(tx.transactionHash);
    const wtHotelAddress = await self.wtIndex.getHotelsByOwner(self.wallet.address);
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(wtHotelAddress[ wtHotelAddress.length-1 ]);
    return wtHotel;
  }

  this.changeHotelInfo = async function(password, hotelAddress, name, description){
    var self = this;
    const wtHotelAddresses = await self.wtIndex.getHotelsByOwner(self.wallet.address);
    const hotelIndex = wtHotelAddresses.indexOf(hotelAddress);
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(hotelAddress);
    let data = wtHotel.editInfo.getData(name, description);
    data = self.wtIndex.callHotel.getData(hotelIndex, data, {from: self.wallet.address});
    let tx = await self.wallet.sendTx(password, {
      to: self.wtIndex.address,
      data: data,
      gasLimit: 4700000
    });
    await self.wallet.waitForTX(tx.transactionHash);
  }

  this.changeHotelAddress = async function(password, hotelAddress, lineOne, lineTwo, zipCode, country){
    var self = this;
    const wtHotelAddresses = await self.wtIndex.getHotelsByOwner(self.wallet.address);
    const hotelIndex = wtHotelAddresses.indexOf(hotelAddress);
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(hotelAddress);
    let data = wtHotel.editAddress.getData(lineOne, lineTwo, zipCode, country);
    data = self.wtIndex.callHotel.getData(hotelIndex, data, {from: self.wallet.address});
    let tx = await self.wallet.sendTx(password, {
      to: self.wtIndex.address,
      data: data,
      gasLimit: 4700000
    });
    return await self.wallet.waitForTX(tx.transactionHash);
  }

  this.changeHotelLocation = async function(password, hotelAddress, timezone, latitude, longitude){
    var self = this;
    const wtHotelAddresses = await self.wtIndex.getHotelsByOwner(self.wallet.address);
    const hotelIndex = wtHotelAddresses.indexOf(hotelAddress);
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(hotelAddress);
    let data = wtHotel.editLocation.getData(timezone, latitude, longitude);
    data = self.wtIndex.callHotel.getData(hotelIndex, data);
    let tx = await self.wallet.sendTx(password, {
      to: self.wtIndex.address,
      data: data,
      gasLimit: 4700000
    });
    return await self.wallet.waitForTX(tx.transactionHash);
  }

  this.addUnitType = async function(password, hotelAddress, unitTypeName){
    var self = this;
    const wtHotelAddresses = await self.wtIndex.getHotelsByOwner(self.wallet.address);
    const hotelIndex = wtHotelAddresses.indexOf(hotelAddress);
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(hotelAddress);

    let data = self.web3.eth.contract(self.contracts.HotelUnitType.abi).new.getData(hotelAddress, self.web3.toHex(unitTypeName), {data: self.contracts.HotelUnitType.unlinked_binary});
    let tx = await self.wallet.sendTx(password, {
      data: data,
      gasLimit: 4700000
    });
    const createTx = await self.wallet.waitForTX(tx.transactionHash);
    let wtHotelUnitType = self.web3.eth.contract(self.contracts.HotelUnitType.abi).at(createTx.contractAddress);

    data = wtHotel.addUnitType.getData(wtHotelUnitType.address, self.web3.toHex(unitTypeName));
    data = self.wtIndex.callHotel.getData(hotelIndex, data);
    tx = await self.wallet.sendTx(password, {
      to: self.wtIndex.address,
      data: data,
      gasLimit: 4700000
    });

    return await self.wallet.waitForTX(tx.transactionHash);
  }

  this.removeUnitType = async function(password, hotelAddress, unitTypeName){
    var self = this;
    const wtHotelAddresses = await self.wtIndex.getHotelsByOwner(self.wallet.address);
    const hotelIndex = wtHotelAddresses.indexOf(hotelAddress);
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(hotelAddress);
    const unitTypeHex = util.bufferToHex(util.setLengthRight(self.web3.toHex(unitTypeName), 32));
    const unitTypeIndex = wtHotel.getUnitTypeNames().indexOf(unitTypeHex);
    let data = wtHotel.removeUnitType.getData(self.web3.toHex(unitTypeName), unitTypeIndex);
    data = self.wtIndex.callHotel.getData(hotelIndex, data);
    const tx = await self.wallet.sendTx(password, {
      to: self.wtIndex.address,
      data: data,
      gasLimit: 4700000
    });

    return await self.wallet.waitForTX(tx.transactionHash);
  }

  this.addUnit = async function(password, hotelAddress, unitType){
    var self = this;
    const wtHotelAddresses = await self.wtIndex.getHotelsByOwner(self.wallet.address);
    const hotelIndex = wtHotelAddresses.indexOf(hotelAddress);
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(hotelAddress);
    let wtHotelUnitType = self.web3.eth.contract(self.contracts.HotelUnitType.abi).at(await wtHotel.getUnitType(self.web3.toHex(unitType)));
    let data = wtHotelUnitType.addUnit.getData();
    data = wtHotel.callUnitType.getData(self.web3.toHex(unitType), data);
    data = self.wtIndex.callHotel.getData(hotelIndex, data);
    let tx = await self.wallet.sendTx(password, {
      to: self.wtIndex.address,
      data: data,
      gasLimit: 4700000
    });

    return await self.wallet.waitForTX(tx.transactionHash);
  }

  this.editUnitType = async function(password, hotelAddress, unitType, description, minGuests, maxGuests, price){
    var self = this;
    const wtHotelAddresses = await self.wtIndex.getHotelsByOwner(self.wallet.address);
    const hotelIndex = wtHotelAddresses.indexOf(hotelAddress);
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(hotelAddress);
    let wtHotelUnitType = self.web3.eth.contract(self.contracts.HotelUnitType.abi).at(await wtHotel.getUnitType(self.web3.toHex(unitType)));
    let data = wtHotelUnitType.edit.getData(description, minGuests, maxGuests, price);
    data = wtHotel.callUnitType.getData(self.web3.toHex(unitType), data);
    data = self.wtIndex.callHotel.getData(hotelIndex, data);
    let tx = await self.wallet.sendTx(password, {
      to: self.wtIndex.address,
      data: data,
      gasLimit: 4700000
    });
    return await self.wallet.waitForTX(tx.transactionHash);
  }

  this.removeUnit = async function(password, hotelAddress, unitType, index){
    var self = this;
    const wtHotelAddresses = await self.wtIndex.getHotelsByOwner(self.wallet.address);
    const hotelIndex = wtHotelAddresses.indexOf(hotelAddress);
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(hotelAddress);
    let wtHotelUnitType = self.web3.eth.contract(self.contracts.HotelUnitType.abi).at(await wtHotel.getUnitType(self.web3.toHex(unitType)));
    let data = wtHotelUnitType.removeUnit.getData(index);
    data = wtHotel.callUnitType.getData(self.web3.toHex(unitType), data);
    data = self.wtIndex.callHotel.getData(hotelIndex, data);
    let tx = await self.wallet.sendTx(password, {
      to: self.wtIndex.address,
      data: data,
      gasLimit: 4700000
    });
    return await self.wallet.waitForTX(tx.transactionHash);
  }

  this.unitActive = async function(password, hotelAddress, unitType, active){
    var self = this;
    const wtHotelAddresses = await self.wtIndex.getHotelsByOwner(self.wallet.address);
    const hotelIndex = wtHotelAddresses.indexOf(hotelAddress);
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(hotelAddress);
    let wtHotelUnitType = self.web3.eth.contract(self.contracts.HotelUnitType.abi).at(await wtHotel.getUnitType(self.web3.toHex(unitType)));
    let data = wtHotelUnitType.unitActive.getData(active);
    data = wtHotel.callUnitType.getData(self.web3.toHex(unitType), data);
    data = self.wtIndex.callHotel.getData(hotelIndex, data);
    let tx = await self.wallet.sendTx(password, {
      to: self.wtIndex.address,
      data: data,
      gasLimit: 4700000
    });
    return await self.wallet.waitForTX(tx.transactionHash);
  }

  this.setUnitPrice = async function(password, hotelAddress, unitType, unitIndex, price, fromDay, amountDays){
    var self = this;
    const wtHotelAddresses = await self.wtIndex.getHotelsByOwner(self.wallet.address);
    const hotelIndex = wtHotelAddresses.indexOf(hotelAddress);
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(hotelAddress);
    let wtHotelUnitType = self.web3.eth.contract(self.contracts.HotelUnitType.abi).at(await wtHotel.getUnitType(self.web3.toHex(unitType)));
    let data = wtHotelUnitType.setPrice.getData(unitIndex, price, fromDay, amountDays);
    data = wtHotel.callUnitType.getData(self.web3.toHex(unitType), data);
    data = self.wtIndex.callHotel.getData(hotelIndex, data);
    let tx = await self.wallet.sendTx(password, {
      to: self.wtIndex.address,
      data: data,
      gasLimit: 4700000
    });
    return await self.wallet.waitForTX(tx.transactionHash);
  }

  this.addAmenity = async function(password, hotelAddress, unitType, amenity){
    var self = this;
    const wtHotelAddresses = await self.wtIndex.getHotelsByOwner(self.wallet.address);
    const hotelIndex = wtHotelAddresses.indexOf(hotelAddress);
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(hotelAddress);
    let wtHotelUnitType = self.web3.eth.contract(self.contracts.HotelUnitType.abi).at(await wtHotel.getUnitType(self.web3.toHex(unitType)));
    let data = wtHotelUnitType.addAmenity.getData(amenity);
    data = wtHotel.callUnitType.getData(self.web3.toHex(unitType), data);
    data = self.wtIndex.callHotel.getData(hotelIndex, data);
    let tx = await self.wallet.sendTx(password, {
      to: self.wtIndex.address,
      data: data,
      gasLimit: 4700000
    });
    return await self.wallet.waitForTX(tx.transactionHash);
  }

  this.removeAmenity = async function(password, hotelAddress, unitType, amenity){
    var self = this;
    const wtHotelAddresses = await self.wtIndex.getHotelsByOwner(self.wallet.address);
    const hotelIndex = wtHotelAddresses.indexOf(hotelAddress);
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(hotelAddress);
    let wtHotelUnitType = self.web3.eth.contract(self.contracts.HotelUnitType.abi).at(await wtHotel.getUnitType(self.web3.toHex(unitType)));
    let data = wtHotelUnitType.removeAmenity.getData(amenity);
    data = wtHotel.callUnitType.getData(self.web3.toHex(unitType), data);
    data = self.wtIndex.callHotel.getData(hotelIndex, data);
    let tx = await self.wallet.sendTx(password, {
      to: self.wtIndex.address,
      data: data,
      gasLimit: 4700000
    });
    return await self.wallet.waitForTX(tx.transactionHash);
  }

  this.getBookings = function(){
    var self = this;
    var txs = [];
    let wtHotelAddresses = this.wtIndex.getHotelsByOwner(this.wallet.address);
    for (var i = 0; i < wtHotelAddresses.length; i++){
      let wtHotel = this.web3.eth.contract(this.contracts.Hotel.abi).at(wtHotelAddresses[i]);
      let unitTypeNames = wtHotel.getUnitTypeNames();
      for (var u = 1; u < unitTypeNames.length; u++)
        txs = _.merge(txs, self.wallet.getTxs({
          address: wtHotel.getUnitType(unitTypeNames[u]),
          from: false
        }));
    }
    for (i = 0; i < txs.length; i++)
      txs[i].decoded = self.abiDecoder.decodeMethod(txs[i].input);
    txs = _.filter(txs, function(t){ return t.decoded});
    for (i = 0; i < txs.length; i++){
      let unitType = self.web3.eth.contract(self.contracts.HotelUnitType.abi).at(txs[i].to);
      txs[i].publicCall = self.abiDecoder.decodeMethod(txs[i].decoded.params[0].value);
      txs[i].privateData = self.web3.toAscii(txs[i].decoded.params[1].value);
      txs[i].unitType = self.web3.toAscii( unitType.unitType() ).replace(/\W+/g, "");
      txs[i].unitName = unitType.units.call( parseInt(txs[i].publicCall.params[1].value) )[0];
      txs[i].hotelAddress = unitType.owner();
      txs[i].hotelName = self.web3.eth.contract(self.contracts.Hotel.abi).at(txs[i].hotelAddress).name();
      txs[i].accepted = false;
    }
    return txs;
  }

  this.getHotels = function(){
    return this.hotels;
  }

  this.getHotelsAddrs = function(){
    return this.hotelsAddrs;
  }

  this.getHotel = function(hotelAddress){
    return this.hotels[hotelAddress];
  }

  this.getReservation = function(hotelAddress, unitType, unitIndex, day){
    var self = this;
    let wtHotel = self.web3.eth.contract(self.contracts.Hotel.abi).at(hotelAddress);
    let wtHotelUnitType = self.web3.eth.contract(self.contracts.HotelUnitType.abi).at(wtHotel.getUnitType(self.web3.toHex(unitType)));
    return wtHotelUnitType.getReservation(unitIndex, day);
  }

};

module.exports = Hotel;
