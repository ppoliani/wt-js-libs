const _ = require('lodash');
const util = require('./util/index');
const HotelManager = require('./HotelManager');
const EventEmitter = require('events');

/**
 * Methods that let managers and clients subscribe to blockchain events emitted by booking
 * activity.
 * @example
 *   const events = new HotelEvents({web3: web3})
 */
class HotelEvents extends EventEmitter {

  /**
   * HotelEvents constructor
   * @param  {Object} _web3
   * @return {HotelEvents}
   */
  constructor(_web3){
    super();

    /**
     * Addresses of the Hotel contracts whose events the class emits.
     * @type {Array}
     */
    this.subscriptions = [];

    /**
     * Web3 instance initialised with a provider.
     * @type {Object}
     */
    this.web3 = _web3;
  }

  /**
   * Hotel contract events formatter and publisher.
   * @param  {Object} err   web3 error object
   * @param  {Object} event web3 event object
   */
  async _emitEvent(err, event){
    if(!event) return;

    const guestData = await util.getGuestData(event.transactionHash, {web3: this.web3});

    const defaults = {
      address: event.address,
      guestData: guestData,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      id: event.id,
    };

    const eventArgsMap = {
      "Book": {
        from: event.returnValues.from,
        unit: event.returnValues.unit,
        fromDate: util.parseDate(event.returnValues.fromDay),
        daysAmount: event.returnValues.daysAmount
      },
      "CallStarted": {
        from: event.returnValues.from,
        dataHash: event.returnValues.dataHash,
      },
      "CallFinish": {
        from: event.returnValues.from,
        dataHash: event.returnValues.dataHash,
      }
    };

    const eventPacket = Object.assign(defaults, eventArgsMap[event.name]);
    this.emit(event.name, eventPacket);
  }

  /**
   * Subscribes to `Book`, `CallStarted` and `CallFinish` events emitted by Hotel
   * contracts
   * @param  {Address|Address[]} _addresses Hotel contracts to listen to
   */
  subscribe(_addresses){
    let hotelsToMonitor = [];

    (Array.isArray(_addresses))
      ? hotelsToMonitor = _addresses
      : hotelsToMonitor.push(_addresses);

    // Prevent duplicate subscriptions
    hotelsToMonitor = hotelsToMonitor.filter( address => {
      return this.subscriptions.findIndex(item => item === address) === -1;
    })

    let events;
    for (let address of hotelsToMonitor){
      const hotel = util.getInstance('Hotel', address, {web3: this.web3});

      hotel.events.Book({}, this._emitEvent.bind(this));
      hotel.events.CallStarted({}, this._emitEvent.bind(this));
      hotel.events.CallFinish({}, this._emitEvent.bind(this));

      this.subscriptions.push(address);
    }
  }
}

module.exports = HotelEvents;

