const _ = require('lodash');
const utils = require('./utils/index');
const HotelManager = require('./HotelManager');

/**
 * Methods that let managers and clients query the blockchain about hotel booking costs, history,
 * and status.
 * @example
 *   const data = new BookingData({web3: web3})
 */
class BookingData {

  /**
   * Instantiates with a web3 object whose provider has been set
   * @param  {Object} web3
   * @return {BookingData}
   */
  constructor(web3){
    this.context = {};
    this.context.web3 = web3;
    this.manager = new HotelManager({web3: web3});
  }

  /**
   * Gets the national currency cost of a booking for a range of days. Check-in is on the
   * first day, check-out on the last.
   * @param  {Address}          unitAddress  Unit contract to edit
   * @param  {Date }            fromDate     check-in date
   * @param  {Number}           daysAmount   integer number of days to book.
   * @return {Number}           Floating point cost ex: 100.00
   * @example
      const cost = await lib.getCost('0xab3..cd', new Date('5/31/2020'), 5);
   */
  async getCost(unitAddress, fromDate, daysAmount){
    const fromDay = utils.formatDate(fromDate);
    const unit = utils.getInstance('HotelUnit', unitAddress, this.context);
    const cost = await unit.methods.getCost(fromDay, daysAmount).call();
    return utils.bnToPrice(cost);
  }

  /**
   * Gets the LifToken cost of a booking for a range of days. Check-in is on the first day,
   * check-out on the last.
   * @param  {Address}          unitAddress  Unit contract to edit
   * @param  {Date }            fromDate     check-in date
   * @param  {Number}           daysAmount   integer number of days to book.
   * @return {Number}           Lif
   * @example
      const cost = await lib.getCost('0xab3..cd', new Date('5/31/2020'), 5);
   */
  async getLifCost(unitAddress, fromDate, daysAmount){
    const fromDay = utils.formatDate(fromDate);
    const unit = utils.getInstance('HotelUnit', unitAddress, this.context);
    const wei = await unit.methods.getLifCost(fromDay, daysAmount).call();

    return utils.lifWei2Lif(wei, this.context);
  }

  /**
   * Checks the availability of a unit for a range of days
   * @param  {Address} unitAddress Unit contract address
   * @param  {Date}    fromDate    check-in date
   * @param  {Number}  daysAmount  number of days
   * @return {Boolean}
   */
  async unitIsAvailable(unitAddress, fromDate, daysAmount){
    const unit = utils.getInstance('HotelUnit', unitAddress, this.context);
    const fromDay = utils.formatDate(fromDate);
    const range = _.range(fromDay, fromDay + daysAmount);

    const isActive = await unit.methods.active().call();
    if (!isActive) return false;

    for (let day of range) {

      const {
        specialPrice,
        specialLifPrice,
        bookedBy
      } = await this.manager.getReservation(unitAddress, day);

      if (!utils.isZeroAddress(bookedBy)) return false;
    }
    return true;
  }

  /**
   * Gets the bookings history for hotel(s). If `fromBlock` is ommitted, method will search from the
   * creation block of each Hotel contract.
   * @param  {Address|Address[]} _addresses  Hotel contract address(es) to fetch bookings for
   * @param  {Number}            fromBlock   Optional: block to begin searching from.
   * @return {Promise}                       Array of bookings objects
   * @example
   * [
   *   {
   *     "transactionHash": "0x0ed3a16220e3b0cab...6ab8225ed0b6bad6ffc9640694d",
   *     "blockNumber": 25,
   *     "id": "log_f72920af",
   *     "from": "0xc9F805a42837E78D5566f6A04Dba7167F8c6A830",
   *     "unit": "0xcE85f98D04B25deaa27406492B6d6B747B837741",
   *     "fromDate": "2020-10-10T07:00:00.000Z",
   *     "daysAmount": "5"
   *    }
   * ]
   */
  async getBookings(_addresses, fromBlock=0){
    let hotelsToQuery = [];
    let bookings = [];

    (Array.isArray(_addresses))
      ? hotelsToQuery = _addresses
      : hotelsToQuery.push(_addresses);

    if (!hotelsToQuery.length) return [];

    let events;
    for (let address of hotelsToQuery){
      const hotel = utils.getInstance('Hotel', address, this.context);

      events = await hotel.getPastEvents('Book', {
        fromBlock: fromBlock
      });

      for (let event of events){
        const guestData = await utils.getGuestData(event.transactionHash, this.context);

        bookings.push({
          guestData: guestData,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          id: event.id,
          from: event.returnValues.from,
          unit: event.returnValues.unit,
          fromDate: utils.parseDate(event.returnValues.fromDay),
          daysAmount: event.returnValues.daysAmount
        })
      };
    }
    return bookings;
  };

  /**
   * Gets pending bookings requests for hotel(s). This is the set of all requests that have not
   * yet been confirmed by a hotel manager. If `fromBlock` is ommitted, method will search from
   * the creation block of each Hotel contract.
   * @param  {Address|Address[]}  _addresses  Hotel contract address(es) to fetch bookings for
   * @param  {Number}             fromBlock   Optional: block to begin searching from.
   * @return {Promise}            Array of bookings objects
   * @example
   *  [
   *    {
   *     "transactionHash": "0x18c59c3f570d4013e0...470ead6560fdcc738a194d0",
   *     "blockNumber": 26,
   *     "id": "log_9b3eb752",
   *     "from": "0x522701D427e1C2e039fdC32Db41972A46dFD7755",
   *     "dataHash": "0x4077e0fee8018bb3dd7...ea91b3d7ced260761c73fa"
   *    }
   *   ]
   */
  async getBookingRequests(_addresses, fromBlock=0){
    let hotelsToQuery = [];
    let requests = [];

    (Array.isArray(_addresses))
      ? hotelsToQuery = _addresses
      : hotelsToQuery.push(_addresses);

    if (!hotelsToQuery.length) return [];

    let startedEvents;
    let finishEvents;
    let unfinished;

    for (let address of hotelsToQuery){
      const hotel = utils.getInstance('Hotel', address, this.context);

      startedEvents = await hotel.getPastEvents('CallStarted', {
        fromBlock: fromBlock
      });

      finishEvents = await hotel.getPastEvents('CallFinish', {
        fromBlock: fromBlock
      })

      // Filter out started events without a corresponding finishing event
      unfinished = startedEvents.filter(event => {
        let found = finishEvents
          .findIndex(item => item.returnValues.dataHash === event.returnValues.dataHash);

        return found === -1;
      })

      for(let event of unfinished){
        const guestData = await utils.getGuestData(event.transactionHash, this.context);

        requests.push({
          guestData: guestData,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          id: event.id,
          from: event.returnValues.from,
          dataHash: event.returnValues.dataHash,
        })
      };
    }

    return requests;
  }
}

module.exports = BookingData;

