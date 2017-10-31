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
    this.context.gasMargin = options.gasMargin || 1;
  }

  /**
   * Async retrieves data assoiciated with a given Hotel contract address
   * address
   * @param  {Address} hotelAddress address of Hotel contract
   * @return {Object}
   * @example
   *  (we should have a doc link to JSON output here)
   */
  async getHotel(hotelAddress){
    const hotel = util.getInstance('Hotel', hotelAddress, this.context);
    this.hotels[hotelAddress] = await util.getHotelInfo(hotel, this.context);
    return this.hotels[hotelAddress];
  }

  /**
   * Async retrieves all data associated with an owners Hotels contracts
   * @return {Object}
   * @example
   * (we should have a doc link to JSON output here)
   */
  async getHotels(){
    this.hotelsAddrs = await this.WTIndex.methods
      .getHotelsByManager(this.owner)
      .call();

    this.hotels = {};
    for (let address of this.hotelsAddrs){
      await this.getHotel(address)
    }

    return this.hotels;
  }

  /**
   * Async receives information about bookings for a specific unit
   * on a specific date.
   * @param  {Address}        unitAddress contract address of Unit
   * @param  {Date | Number}  day         Date | UTC day since 1970 to get info for
   * @return {Promievent}
   * @example
   *   const {
   *     specialPrice,    // Price: 200.00
   *     specialLifPrice, // LifPrice (ether): 20
   *     bookedBy         // Address: e.g. '0x39a...2b'
   *   } = await lib.getReservation('0xab3..cd', new Date('5/31/2020'));
   */
  async getReservation(unitAddress, day) {
    if (day instanceof Date)
      day = util.formatDate(day);

    const unit = util.getInstance('HotelUnit', unitAddress, this.context);
    const result = await unit.methods.getReservation(day).call();

    const specialPrice = util.bnToPrice(result[0]);
    const specialLifPrice = util.lifWei2Lif(result[1], this.context);
    const bookedBy = result[2];

    return {
      specialPrice: specialPrice,
      specialLifPrice: specialLifPrice,
      bookedBy: bookedBy
    }
  }

  /**
   * Sync gets the hotel data previously retrieved by a `getHotel` call
   * @return {Object}
   * @example
   *   (we should have a doc link to JSON output here)
   */
  getCachedHotel(hotelAddress) {
    return this.hotels[hotelAddress];
  }

  /**
   * Sync gets hotel data previously retrieved by a `getHotels` call (see above)
   * @return {Object}
   * @example
   *   (we should have a doc link to JSON output here)
   */
  getCachedHotels() {
    return this.hotels;
  }

  /**
   * Sync gets the contract addresses of all hotels previously retrieved by a `getHotels` call
   * @return {Array}
   * @example
   *  const [Hotel1, Hotel2] = lib.getHotelsAddrs();
   */
  getCachedHotelsAddrs() {
    return this.hotelsAddrs;
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

    const data = await this.WTIndex.methods
      .registerHotel(name, description)
      .encodeABI();

    const options = {
      from: this.owner,
      to: this.WTIndex.options.address,
      gas: util.addGasMargin(estimate, this.context),
      data: data
    }

    return this.web3.eth.sendTransaction(options);
  }

  /**
   * Sets a boolean flag in the Hotel contract that determines whether bookings
   * can happen instantly or require confirmation by a manager before they
   * proceed.
   * @param {Address} hotelAddress  Contract address of the hotel to edit.
   * @param {Boolean} value         t/f: require confirmation
   */
  async setRequireConfirmation(hotelAddress, value){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const data = await hotel.methods
      .changeConfirmation(value)
      .encodeABI();

    return util.execute(data, index, this.context);
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
   * Confirms a pending booking request. `reservationId` is the value of the `dataHash` field
   * from a `CallStarted` event fired when a booking that requires confirmation is initiated.
   * @param  {Address} hotelAddress  Hotel contract address that controls unit requested
   * @param  {String}  reservationId data hash.
   * @return {Promievent}
   */
  async confirmBooking(hotelAddress, reservationId){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const data = await hotel.methods
      .continueCall(reservationId)
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

    return util.execute(hotelData, index, this.context);
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

    return util.execute(hotelData, index, this.context);
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

    return util.execute(hotelData, index, this.context);
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

    return util.execute(data, index, this.context);
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

    return util.execute(hotelData, index, this.context);
  }

  /**
   * Get the real currency booking price for range of days. Check-in is on
   * the first day, check-out on the last.
   * @param  {Address}  unitAddress  Unit contract to edit
   * @param  {Date}    fromDate      check-in date
   * @param  {Number}  amountDays    integer number of days to book.
   * @return {Promievent}
   */
  async getCost(unitAddress, fromDate, amountDays){
    const fromDay = util.formatDate(fromDate);
    const unit = util.getInstance('HotelUnit', unitAddress, this.context);
    const cost = await unit.methods.getCost(fromDay, amountDays).call();
    return util.bnToPrice(cost);
  }

  /**
   * Get the Lif booking price for range of days. Check-in is on
   * the first day, check-out on the last.
   * @param  {Address}  unitAddress  Unit contract to edit
   * @param  {Date}    fromDate      check-in date
   * @param  {Number}  amountDays    integer number of days to book.
   * @return {Promievent}
   */
  async getLifCost(unitAddress, fromDate, amountDays){
    const fromDay = util.formatDate(fromDate);
    const unit = util.getInstance('HotelUnit', unitAddress, this.context);
    const cost = await unit.methods.getLifCost(fromDay, amountDays).call();
    const lif = util.lifWei2Lif(cost, this.context)
    return parseInt(lif);
  }

  /**
   * Sets the default price for a unit
   * @param {Address}   hotelAddress  Hotel contract that controls the Unit being edited
   * @param {Address}   unitAddress   Unit contract to edit
   * @param {Number}    price         Integer or floating point price
   * @return {Promievent}
   */
  async setDefaultPrice(hotelAddress, unitAddress, price){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const uintPrice = util.priceToUint(price);
    const unit = util.getInstance('HotelUnit', unitAddress, this.context);

    const unitData = unit.methods
      .setDefaultPrice(uintPrice)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    await util.execute(hotelData, index, this.context);
  }

  /**
   * Sets the default LifPrice for this unit
   * @param  {Address}          hotelAddress Hotel contract that controls the Unit contract to edit
   * @param  {Address}          unitAddress  Unit contract to edit
   * @param  {String|Number|BN} price        Lif 'ether' (converted to wei by web3.utils.toWei)
   * @return {Promievent}
  */
  async setDefaultLifPrice(hotelAddress, unitAddress, price){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const weiPrice = util.lif2LifWei(price, this.context);
    const unit = util.getInstance('HotelUnit', unitAddress, this.context);

    const unitData = unit.methods
      .setDefaultLifPrice(weiPrice)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    await util.execute(hotelData, index, this.context);
  }

  /**
   * Changes the default currency code
   * @param {Address}   hotelAddress  Hotel contract that controls the Unit being edited
   * @param {Address}   unitAddress   Unit contract to edit
   * @param {Number}    code          Integer currency code btw 0 and 255
   * @param {Function}  converter     ex `euro = kroneToEuro(krone)`
   * @param {Date}      convertStart  date to begin search of specialPrices
   * @param {Date}      convertEnd    date (inclusive) to end search of specialPrices
   * @return {Promievent}
   */
  async setCurrencyCode(hotelAddress, unitAddress, code, converter, convertStart, convertEnd){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    code = util.currencyCodeToHex(code, this.context);
    const unit = util.getInstance('HotelUnit', unitAddress, this.context);

    const unitData = unit.methods
      .setCurrencyCode(code)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    await util.execute(hotelData, index, this.context);

    // -------------------------------- NB ----------------------------------------
    // We probably need to iterate through a range of dates and
    // convert special prices from old to new denomination. We probably also need
    // to estimate how many we can do at once.
  }

  /**
   * Set a Unit contracts real currency booking price for range of days. Check-in is on
   * the first day, check-out on the last.
   * @param  {Address} hotelAddress Hotel contract that controls the Unit contract to edit
   * @param  {Addres}  unitAddress  Unit contract to edit
   * @param  {Number}  price        integer or floating point price
   * @param  {Date}    fromDate     check-in date
   * @param  {Number}  amountDays   integer number of days to book.
   * @return {Promievent}
   */
  async setUnitSpecialPrice(hotelAddress, unitAddress, price, fromDate, amountDays){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const fromDay = util.formatDate(fromDate);
    const uintPrice = util.priceToUint(price);

    const unit = util.getInstance('HotelUnit', unitAddress, this.context);

    const unitData = unit.methods
      .setSpecialPrice(uintPrice, fromDay, amountDays)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    return util.execute(hotelData, index, this.context);
  }

  /**
   * Set a Unit contracts booking price for range of days. Check-in is on the first day,
   * check-out on the last.
   * @param  {Address}          hotelAddress Hotel contract that controls the Unit contract to edit
   * @param  {Address}          unitAddress  Unit contract to edit
   * @param  {String|Number|BN} price        Lif 'ether' (converted to wei by web3.utils.toWei)
   * @param  {Date}             fromDate     check-in date
   * @param  {Number}           amountDays   integer number of days to book.
   * @return {Promievent}
   */
  async setUnitSpecialLifPrice(hotelAddress, unitAddress, price, fromDate, amountDays){
    const {
      hotel,
      index
    } = await util.getHotelAndIndex(hotelAddress, this.context);

    const lifPrice = util.lif2LifWei(price, this.context);
    const fromDay = util.formatDate(fromDate);
    const unit = util.getInstance('HotelUnit', unitAddress, this.context);

    const unitData = unit.methods
      .setSpecialLifPrice(lifPrice, fromDay, amountDays)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    return util.execute(hotelData, index, this.context);
  }
};

module.exports = HotelManager;
