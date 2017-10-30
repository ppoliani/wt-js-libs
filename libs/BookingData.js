const _ = require('lodash');
const util = require('./util/index');
const HotelManager = require('./HotelManager');

/**
 * BookingData provides methods that let clients query the blockchain about costs
 * of specific reservations, the bookings that have been made at a hotel, and bookings requested
 * for a hotel.
 */
class BookingData {

  constructor(web3){
    this.context = {};
    this.context.web3 = web3;
    this.manager = new HotelManager({web3: web3});
  }

  /**
   * Gets the total real currency cost of booking for a range of days. Check-in is on the first day,
   * check-out on the last.
   * @param  {Address}          hotelAddress Hotel contract that controls the Unit contract to edit
   * @param  {Addres}           unitAddress  Unit contract to edit
   * @param  {String|Number|BN} price        Lif 'ether' (converted to wei by web3.utils.toWei)
   * @param  {Date }            fromDate     check-in date
   * @param  {Number}           amountDays   integer number of days to book.
   * @return {Number}           Floating point cost ex: 100.00
   * @example
      const cost = await lib.getCost('0xab3..cd', new Date('5/31/2020'), 5);
   */
  async getCost(unitAddress, fromDate, daysAmount){
    const fromDay = util.formatDate(fromDate);
    const unit = util.getInstance('HotelUnit', unitAddress, this.context);
    const cost = await unit.methods.getCost(fromDay, daysAmount).call();
    return util.bnToPrice(cost);
  }

  /**
   * Gets the total real currency cost of booking for a range of days. Check-in is on the first day,
   * check-out on the last.
   * @param  {Address}          hotelAddress Hotel contract that controls the Unit contract to edit
   * @param  {Addres}           unitAddress  Unit contract to edit
   * @param  {String|Number|BN} price        Lif 'ether' (converted to wei by web3.utils.toWei)
   * @param  {Date }            fromDate     check-in date
   * @param  {Number}           amountDays   integer number of days to book.
   * @return {Number}           Lif
   * @example
      const cost = await lib.getCost('0xab3..cd', new Date('5/31/2020'), 5);
   */
  async getLifCost(unitAddress, fromDate, daysAmount){
    const fromDay = util.formatDate(fromDate);
    const unit = util.getInstance('HotelUnit', unitAddress, this.context);
    const wei = await unit.methods.getLifCost(fromDay, daysAmount).call();

    return util.lifWei2Lif(wei, this.context);
  }

  /**
   * Async method that verifies that a unit is available for a desired range of days
   * @param  {Address} unitAddress Unit contract address
   * @param  {Date}    fromDate    check-in date
   * @param  {Number}  daysAmount  number of days
   * @return {Boolean}
   */
  async unitIsAvailable(unitAddress, fromDate, daysAmount){
    const unit = util.getInstance('HotelUnit', unitAddress, this.context);
    const fromDay = util.formatDate(fromDate);
    const range = _.range(fromDay, fromDay + daysAmount);

    const isActive = await unit.methods.active().call();
    if (!isActive) return false;

    for (let day of range) {
      const {
        specialPrice,
        specialLifPrice,
        bookedBy
      } = await this.manager.getReservation(unitAddress, day);

      if (!util.isZeroAddress(bookedBy)) return false;
    }
    return true;
  }

  /**
   * Async retrieves the bookings history associated a hotel address or addresses. If
   * `startBlock` is ommitted, method will search from the creation block of each Hotel contract.
   * @param  {Address | Array} _addresses  Hotel contract address(es) to fetch bookings for
   * @param  {Number}          startBlock  Optional: block to begin searching from.
   * @return {Promise}                     Array of bookings objects
   */
  async getBookings(_addresses, fromBlock){
    let addresses = [];

    (Array.isArray(addresses))
      ? addresses = _addresses
      : addresses.push(address);

  }

  /**
   * Async retrieves the outstanding bookings requests associated a hotel address or addresses.
   * This is the set of all requests (wt-contract event: `CallStarted`) that do not have
   * a matching completion (wt-contract event: `CallFinished`). If `startBlock` is ommitted,
   * method will search from the creation block of each Hotel contract.
   * `startBlock` is ommitted, method will search from the creation block of each Hotel contract.
   * @param  {Address | Array} _addresses  Hotel contract address(es) to fetch bookings for
   * @param  {Number}          startBlock  Optional: block to begin searching from.
   * @return {Promise}         Array of bookings objects
   */
  async getBookingRequests(_addresses, fromBlock){
    let addresses = [];

    (Array.isArray(addresses))
      ? addresses = _addresses
      : addresses.push(address);
  }
}

module.exports = BookingData;