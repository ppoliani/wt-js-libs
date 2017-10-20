const util = require('./util/index.js');

/**
 * Hotel
 * @example
 *   const hotel = new Hotel({
 *     indexAddress: '0x75a3...b', // Address of the WTIndex contract that lists this hotel
 *     owner: '0xab3...cd',        // Payer of lib tx fees, registered as owner the WTIndex
 *     web3: web3,                 // Instantiated web3 object with its provider set.
 *   });
 */
class Hotel {

  constructor(options){
    this.hotels = options.hotels || {};
    this.hotelsAddrs = [];
    this.owner = options.owner || null;
    this.web3 = options.web3 || {};
    this.context = options;

    this.WTIndex = util.getInstance('WTIndex', options.indexAddress, this.context);
    this.context.WTIndex = this.WTIndex;
  }

  async fetchBookings(){}

  async fetchHotel(hotelAddress){
    const hotel = util.getInstance('Hotel', hotelAddress, this.context);
    this.hotels[hotelAddress] = await util.getHotelInfo(hotel, this.context);
    return this.hotels[hotelAddress];
  }

  async fetchHotels(){
    this.hotelsAddrs = await this.WTIndex.methods
      .getHotelsByOwner(this.owner)
      .call();

    this.hotels = {};
    for (let address of this.hotelsAddrs){
      await this.fetchHotel(address)
    }

    return this.hotels;
  }

  async fetchReservation(unitAddress, day) {
    const unit = util.getInstance('HotelUnit', unitAddress, this.context);
    return unit.methods.getReservation(day).call();
  }

  getHotels() {
    return this.hotels;
  }

  getHotelsAddrs() {
    return this.hotelsAddrs;
  }

  getHotel(hotelAddress) {
    return this.hotels[hotelAddress];
  }

  setOwner(account){
    this.owner = account;
    this.context.owner = account;
  }

  setWeb3(_web3){
    this.web3 = _web3;
    this.context.web3 = _web3;
  }

  async createHotel(name, description){
    const estimate = await this.WTIndex.methods
      .registerHotel(name, description)
      .estimateGas();

    const options = {
      from: this.owner,
      gas: estimate
    }

    return this.WTIndex.methods
      .registerHotel(name, description)
      .send(options)
  }

  async changeHotelInfo(hotelAddress, name, description){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const data = await hotel.methods
      .editInfo(name, description)
      .encodeABI();

    return util.execute(data, index, this.context);
  }

  async changeHotelAddress(hotelAddress, lineOne, lineTwo, zipCode, country){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const data = await hotel.methods
      .editAddress(lineOne, lineTwo, zipCode, country)
      .encodeABI();

    return util.execute(data, index, this.context);
  }

  async changeHotelLocation(hotelAddress, timezone, latitude, longitude){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const {long, lat} = util.locationToUint(longitude, latitude);

    const data = await hotel.methods
      .editLocation(timezone, long, lat)
      .encodeABI();

    return util.execute(data, index, this.context);
  }

  async addUnitType(hotelAddress, unitType){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const typeHex = this.web3.utils.toHex(unitType);
    const instance = await util.deployUnitType(unitType, hotelAddress, this.context)

    const data = hotel.methods
      .addUnitType(instance.options.address, typeHex)
      .encodeABI();

    return util.execute(data, index, this.context);
  }

  async removeUnitType(hotelAddress, unitType){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const typeIndex = await util.getUnitTypeIndex(hotel, unitType, this.context);
    const typeHex = this.web3.utils.toHex(unitType);

    const data = hotel.methods
      .removeUnitType(typeHex, typeIndex)
      .encodeABI();

    return util.execute(data, index, this.context, 400000); //<- testrpc bug estimating deletions?
  }

  async editUnitType(hotelAddress, unitType, description, minGuests, maxGuests, price){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const typeHex = this.web3.utils.toHex(unitType);
    const address = await hotel.methods.getUnitType(typeHex).call();
    const instance = util.getInstance('HotelUnitType', address, this.context);

    const editData = instance.methods
      .edit(description, minGuests, maxGuests, price)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnitType(typeHex, editData)
      .encodeABI();

    return util.execute(hotelData, index, this.context, 400000); // Can't estimate
  }

  async addAmenity(hotelAddress, unitType, amenity){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const typeHex = this.web3.utils.toHex(unitType);
    const address = await hotel.methods.getUnitType(typeHex).call();
    const instance = util.getInstance('HotelUnitType', address, this.context);

    const amenityData = instance.methods
      .addAmenity(amenity)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnitType(typeHex, amenityData)
      .encodeABI();

    return util.execute(hotelData, index, this.context, 400000); // Can't estimate
  }

  async removeAmenity(hotelAddress, unitType, amenity){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const typeHex = this.web3.utils.toHex(unitType);
    const address = await hotel.methods.getUnitType(typeHex).call();
    const instance = util.getInstance('HotelUnitType', address, this.context);

    const amenityData = instance.methods
      .removeAmenity(amenity)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnitType(typeHex, amenityData)
      .encodeABI();

    return util.execute(hotelData, index, this.context, 400000); // Can't estimate
  }

  async addUnit(hotelAddress, unitType){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const typeHex = this.web3.utils.toHex(unitType);
    const instance = await util.deployUnit(unitType, hotelAddress, this.context)

    const data = hotel.methods
      .addUnit(typeHex, instance.options.address)
      .encodeABI();

    return util.execute(data, index, this.context);
  }

  async removeUnit(hotelAddress, unitAddress){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const data = hotel.methods
      .removeUnit(unitAddress)
      .encodeABI();

    return util.execute(data, index, this.context, 400000); // Can't estimate
  }

  async setUnitActive(hotelAddress, unitAddress, active){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const unit = util.getInstance('HotelUnit', unitAddress, this.context);

    const unitData = unit.methods
      .setActive(active)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    return util.execute(hotelData, index, this.context, 400000); // Can't estimate
  }

  async setUnitPrice(hotelAddress, unitAddress, price, fromDay, amountDays){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const unit = util.getInstance('HotelUnit', unitAddress, this.context);

    const unitData = unit.methods
      .setPrice(price, fromDay, amountDays)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    return util.execute(hotelData, index, this.context, 400000); // Can't estimate
  }
};

module.exports = Hotel;
