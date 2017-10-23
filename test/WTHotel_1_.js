'use strict';

const assert = require('chai').assert;
const util = require('../libs/util/index');
const _ = require('lodash');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);

let WTHotel;

(process.argv.indexOf('test-build') > 0)
  ? WTHotel = require('../dist/node/WTHotel_1_.js')
  : WTHotel = require('../libs/WTHotel_1_.js');

describe('WTHotel', function() {
  const hotelName = 'WTHotel';
  const hotelDescription = 'Winding Tree Hotel';

  let lib;
  let index;
  let fundingSource;
  let daoAccount;
  let ownerAccount;

  before(async function(){
    const privateKey = "0xfc452929dc8ffd956ebab936ed0f56d71a8c537b0393ea9da4807836942045c5"
    const wallet = await web3.eth.accounts.wallet.add(privateKey);
    const accounts = await web3.eth.getAccounts();

    fundingSource = accounts[0];
    ownerAccount = wallet.address;

    await util.fundAccount(fundingSource, ownerAccount, 50, web3);
  })

  beforeEach(async function() {
    index = await util.createIndexContract(fundingSource, web3);

    lib = new WTHotel({
      indexAddress: index.options.address,
      owner: fundingSource,
      web3: web3
    })
  });

  describe('createHotel', function(){

    it('should create a hotel | retrieve hotel from the blockchain', async function() {
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.fetchHotels();
      const address = Object.keys(hotels)[0];
      const hotel = hotels[address];

      assert.equal(hotel.name, hotelName);
      assert.equal(hotel.description, hotelDescription);
    })
  });

  describe('Hotel', function(){
    let address;

    beforeEach(async function(){
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.fetchHotels();
      address = Object.keys(hotels)[0];
    });

    it('changeHotelInfo: edits the hotel info', async function(){
      const newName = 'Awesome WTHotel';
      const newDescription = 'Awesome Winding Tree Hotel';

      await lib.changeHotelInfo(address, newName, newDescription);
      const hotel = await lib.fetchHotel(address);

      assert.equal(hotel.name, newName);
      assert.equal(hotel.description, newDescription);
    });

    it('changeHotelAddress: edits the hotel address', async function(){
      const lineOne = 'Address one';
      const lineTwo = 'Address two';
      const zip = '57575';
      const country = 'Spain';

      await lib.changeHotelAddress(address, lineOne, lineTwo, zip, country);
      const hotel = await lib.fetchHotel(address);

      assert.equal(hotel.lineOne, lineOne);
      assert.equal(hotel.lineTwo, lineTwo);
      assert.equal(hotel.zip, zip);
      assert.equal(hotel.country, country);
    });

    it('changeHotelLocation: edits the hotel address', async function(){
      const timezone = 15;
      const longitude = 50;
      const latitude = 15;

      await lib.changeHotelLocation(address, timezone, latitude, longitude);
      const hotel = await lib.fetchHotel(address);

      assert.equal(hotel.longitude, longitude);
      assert.equal(hotel.latitude, latitude);
    });

  });

  describe('UnitTypes', () => {
    const typeName = 'BASIC_ROOM'
    let address;

    beforeEach(async function(){
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.fetchHotels();
      address = Object.keys(hotels)[0];
    });

    it('addUnitType: adds a unit type to the hotel', async () => {
      await lib.addUnitType(address, typeName);
      const hotel = await lib.fetchHotel(address);

      assert(hotel.unitTypeNames.includes(typeName));
      assert.isDefined(hotel.unitTypes[typeName]);
    });

    it('addUnitType: initializes info correctly', async() => {
      await lib.addUnitType(address, typeName);
      let hotel = await lib.fetchHotel(address);

      assert.isNull(hotel.unitTypes[typeName].info.description);
      assert.isNull(hotel.unitTypes[typeName].info.price);
      assert.isNull(hotel.unitTypes[typeName].info.minGuests);
      assert.isNull(hotel.unitTypes[typeName].info.maxGuests);
    });

    it('removeUnitType: removes a UnitType from the hotel', async() => {
      await lib.addUnitType(address, typeName);
      let hotel = await lib.fetchHotel(address);

      assert(hotel.unitTypeNames.includes(typeName));
      assert.isDefined(hotel.unitTypes[typeName]);

      await lib.removeUnitType(address, typeName);
      hotel = await lib.fetchHotel(address);

      assert.isFalse(hotel.unitTypeNames.includes(typeName));
      assert.isUndefined(hotel.unitTypes[typeName]);
    });

    it('editUnitType: edits UnitType info correctly', async() => {
      const description = 'Adobe';
      const minGuests = 1;
      const maxGuests = 2;
      const price = '250 euro';

      await lib.addUnitType(address, typeName);
      await lib.editUnitType(
        address,
        typeName,
        description,
        minGuests,
        maxGuests,
        price
      );
      let hotel = await lib.fetchHotel(address);

      assert.equal(hotel.unitTypes[typeName].info.description, description);
      assert.equal(hotel.unitTypes[typeName].info.price, price);
      assert.equal(hotel.unitTypes[typeName].info.minGuests, minGuests);
      assert.equal(hotel.unitTypes[typeName].info.maxGuests, maxGuests);
    });

    it('addAmenity: adds an amenity to the UnitType', async () => {
      const amenity = 10;
      await lib.addUnitType(address, typeName);
      await lib.addAmenity(address, typeName, amenity);
      let hotel = await lib.fetchHotel(address);

      assert.isTrue(hotel.unitTypes[typeName].amenities.includes(amenity));
    });

    it('removeAmenity: removes an amenity from the UnitType', async () => {
      const amenity = 10;
      await lib.addUnitType(address, typeName);
      await lib.addAmenity(address, typeName, amenity);
      let hotel = await lib.fetchHotel(address);

      assert.isTrue(hotel.unitTypes[typeName].amenities.includes(amenity));

      await lib.removeAmenity(address, typeName, amenity);
      hotel = await lib.fetchHotel(address);

      assert.isFalse(hotel.unitTypes[typeName].amenities.includes(amenity));
    });
  });

  describe('Units', () => {
    const typeName = 'BASIC_ROOM'
    let address;

    beforeEach(async function(){
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.fetchHotels();
      address = Object.keys(hotels)[0];
      await lib.addUnitType(address, typeName);
    });

    it('addUnit: adds a unit to the hotel', async () => {
      await lib.addUnit(address, typeName);
      const hotel = await lib.fetchHotel(address);
      const unitAddress = hotel.unitAddresses[0];

      assert.isDefined(hotel.units[unitAddress]);
      assert.isTrue(hotel.units[unitAddress].active);
      assert.equal(hotel.units[unitAddress].unitType, typeName);
    });

    it('removeUnit: removes a unit from the hotel', async () => {
      await lib.addUnit(address, typeName);
      let hotel = await lib.fetchHotel(address);
      const unitAddress = hotel.unitAddresses[0];

      assert.isDefined(hotel.units[unitAddress]);

      await lib.removeUnit(address, unitAddress);
      hotel = await lib.fetchHotel(address);

      assert.isUndefined(hotel.units[unitAddress]);
    });

    it('setUnitActive: sets the units active status', async () => {
      await lib.addUnit(address, typeName);
      let hotel = await lib.fetchHotel(address);
      const unitAddress = hotel.unitAddresses[0];

      assert.isTrue(hotel.units[unitAddress].active);

      await lib.setUnitActive(address, unitAddress, false);
      hotel = await lib.fetchHotel(address);
      assert.isFalse(hotel.units[unitAddress].active);
    })

    it('setUnitPrice: sets the units price', async () => {
      const price =  "100 eur";
      const fromDay = 77;
      const daysAmount = 5;

      await lib.addUnit(address, typeName);
      let hotel = await lib.fetchHotel(address);
      const unitAddress = hotel.unitAddresses[0];

      await lib.setUnitPrice(
        address,
        unitAddress,
        price,
        fromDay,
        daysAmount
      );
      const range = _.range(fromDay, fromDay + daysAmount);

      for (let day of range) {
        const res = await lib.fetchReservation(unitAddress, day);
        const specialPrice = res[0];
        assert.equal(specialPrice, price);
      }
    })
  });
});


