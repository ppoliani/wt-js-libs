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
class HotelManager {

  constructor(options){
    this.hotels = options.hotels || {};
    this.hotelsAddrs = [];
    this.owner = options.owner || null;
    this.web3 = options.web3 || {};
    this.context = options;

    this.WTIndex = util.getInstance('WTIndex', options.indexAddress, this.context);
    this.context.WTIndex = this.WTIndex;
  }

  /**
   * Async retrieves the bookings transaction history associated with each of the owner's hotels.
   * @return {Object}
   */
  async fetchBookings(){}

  /**
   * Async fetches from the blockchain data for Hotel at a given contract
   * address
   * @param  {Address} hotelAddress address of Hotel contract
   * @return {Object}
   * @example
   *  (we should have a doc link to JSON output here)
   */
  async fetchHotel(hotelAddress){
    const hotel = util.getInstance('Hotel', hotelAddress, this.context);
    this.hotels[hotelAddress] = await util.getHotelInfo(hotel, this.context);
    return this.hotels[hotelAddress];
  }

  /**
   * Async fetches from the blockchain data for all of an owners Hotels contracts
   * @return {Object}
   * @example
   * (we should have a doc link to JSON output here)
   */
  async fetchHotels(){
    this.hotelsAddrs = await this.WTIndex.methods
      .getHotelsByManager(this.owner)
      .call();

    this.hotels = {};
    for (let address of this.hotelsAddrs){
      await this.fetchHotel(address)
    }

    return this.hotels;
  }

  /**
   * Async fetches from the blockchain information about bookings for a specific unit
   * on a specific UTC day.
   * @param  {Address} unitAddress contract address of Unit
   * @param  {Number}  day         Integer UTC day since 1-1-1970
   * @return {Promievent}
   * @example
   *   const {
   *     specialPrice, // Price string: e.g '200 euros'
   *     bookedBy      // Address: e.g. '0x39a...2b'
   *   } = await lib.fetchReservation('0xab3..cd', 11521330);
   */
  async fetchReservation(unitAddress, day) {
    const unit = util.getInstance('HotelUnit', unitAddress, this.context);
    return unit.methods.getReservation(day).call();
  }

  /**
   * Sync gets hotel data previously retrieved by a `fetchHotels` call (see above)
   * @return {Object}
   * @example
   *   (we should have a doc link to JSON output here)
   */
  getHotels() {
    return this.hotels;
  }

  /**
   * Sync gets the contract addresses of all hotels previously retrieved by a `fetchHotels` call
   * @return {Array}
   * @example
   *  const [Hotel1, Hotel2] = lib.getHotelsAddrs();
   */
  getHotelsAddrs() {
    return this.hotelsAddrs;
  }

  /**
   * Sync gets the hotel data previously retrieved by a `fetchHotel` call
   * @return {Object}
   * @example
   *   (we should have a doc link to JSON output here)
   */
  getHotel(hotelAddress) {
    return this.hotels[hotelAddress];
  }

  /**
   * Sets the value of the Hotels class owner's account
   * @param {Address} account ex: `0xabc..345`
   */
  setOwner(account){
    this.owner = account;
    this.context.owner = account;
  }

  /**
   * Sets the Hotel class's web3 instance.
   * @param {Object} _web3 Web3 instance, already instantiated with a provider
   */
  setWeb3(_web3){
    this.web3 = _web3;
    this.context.web3 = _web3;
  }

  /**
   * Creates a Hotel contract instance and register's it through the Hotel class's WTIndex contract
   * @param  {String} name        plaintext name
   * @param  {String} description plaintext description
   * @return {Promievent}
   */
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

  /**
   * Edits the name and description of a Hotel contract
   * @param  {Address} hotelAddress contract address
   * @param  {String}  name         plaintext hotel name
   * @param  {String}  description  plaintext hotel description
   * @return {Promievent}
   */
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

  /**
   * Edits the physical address data of a Hotel contract
   * @param  {Address} hotelAddress contract address
   * @param  {String} lineOne       physical address data
   * @param  {String} lineTwo       physical address data
   * @param  {String} zipCode       physical address data
   * @param  {String} country       physical address data
   * @return {Promievent}
   */
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

  /**
   * Edits physical coordinate location and timezone data of a Hotel contract
   * @param  {Address} hotelAddress contract address
   * @param  {Number} timezone      positive integer timezone relative to GMT
   * @param  {Number} latitude      GPS latitude location data e.g -3.703578
   * @param  {Number} longitude     GPS longitude location data e.g 40.426371
   * @return {Promievent}
   */
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

  /**
   * Deploys a UnitType contract and registers it to an existing Hotel contract
   * @param  {Address} hotelAddress Hotel contract that will control created UnitType contract
   * @param  {String} unitType      unique plaintext id of UnitType, ex: 'BASIC_ROOM'
   * @return {Promievent}
   */
  async addUnitType(hotelAddress, unitType){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const instance = await util.deployUnitType(unitType, hotelAddress, this.context)

    const data = hotel.methods
      .addUnitType(instance.options.address)
      .encodeABI();

    return util.execute(data, index, this.context);
  }

  /**
   * Unregisters a UnitType contract from an existing Hotel contract
   * @param  {Address} hotelAddress Hotel contract that controls the UnitType contract to remove
   * @param  {String}  unitType     unique plaintext id of UnitType, ex: 'BASIC_ROOM'
   * @return {Promievent}
   */
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

  /**
   * Edits the basic info data of a UnitType contract
   * @param  {Address} hotelAddress Hotel contract that controls the UnitType contract to edit
   * @param  {String} unitType      unique plaintext id of UnitType, ex: 'BASIC_ROOM'
   * @param  {String} description   plaintext description: e.g. 'Simple. Clean.'
   * @param  {Number} minGuests     minimum number of guests that can stay in UnitType
   * @param  {Number} maxGuests     maximum number of guests that can stay in UnitType
   * @param  {String} price         plaintext price of UnitType: e.g '50 euros'
   * @return {Promievent}
   */
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

  /**
   * Adds an amenity to a UnitType contract
   * @param  {Address} hotelAddress Hotel contract that controls the UnitType contract to edit
   * @param  {String} unitType      unique plaintext id of UnitType, ex: 'BASIC_ROOM'
   * @param  {Number} amenity       integer code of amenity to add: ex: 23
   * @return {Promievent}
   */
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

  /**
   * Removes an amenity from a UnitType contract
   * @param  {Address} hotelAddress   Hotel contract that controls the UnitType contract to edit
   * @param  {String}  unitType       unique plaintext id of UnitType, ex: 'BASIC_ROOM'
   * @param  {Number}  amenity        integer code of amenity to remove: ex: 23
   * @return {Promievent}
   */
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

  /**
   * Deploys a Unit contract and registers it to an existing Hotel contract
   * @param {Address} hotelAddress  Hotel contract that will control created Unit contract
   * @param {String}  unitType      unique plaintext id of this units UnitType, ex: 'BASIC_ROOM'
   * @return {Promievent}
   */
  async addUnit(hotelAddress, unitType){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const instance = await util.deployUnit(unitType, hotelAddress, this.context)

    const data = hotel.methods
      .addUnit(instance.options.address)
      .encodeABI();

    return util.execute(data, index, this.context);
  }

  /**
   * Unregisters a Unit contract from an existing Hotel contract
   * @param  {Address} hotelAddress   Hotel contract that controls the Unit contract to remove
   * @param  {Address} unitAddress    Unit contract to remove
   * @return {Promievent}
   */
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

  /**
   * Sets a Unit contracts `active` status. This determines whether or not it can be booked.
   * @param {Address} hotelAddress  Hotel contract that controls the Unit contract to edit
   * @param {Address} unitAddress   Unit contract to edit
   * @param {Boolean} active        When false, the unit cannot be booked.
   */
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

  /**
   * Set a Unit contracts booking price for range of days. Check-in is on the first day,
   * check-out on the last.
   * @param  {Address} hotelAddress Hotel contract that controls the Unit contract to edit
   * @param  {Addres}  unitAddress  Unit contract to edit
   * @param  {String}  price        plaintext price: ex: '200 eur'
   * @param  {Number}  fromDay      integer UTC day since 1-1-1970
   * @param  {Number}  amountDays   integer number of days to book.
   * @return {Promievent}
   */
  async setUnitPrice(hotelAddress, unitAddress, price, fromDay, amountDays){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const unit = util.getInstance('HotelUnit', unitAddress, this.context);

    const unitData = unit.methods
      .setSpecialPrice(price, fromDay, amountDays)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    return util.execute(hotelData, index, this.context, 400000); // Can't estimate
  }
};

module.exports = HotelManager;
