const util = require('./util/index');
const errors = require('./util/errors');
const BookingData = require('./BookingData');

/**
 * Methods that allow hotel clients to make bookings.
 * @example
 *   const user = new User({
 *     account: '0xabcd...123',       // Client's account address
 *     gasMargin: 1.24,               // Multiple to increase gasEstimate by to ensure tx success.
 *     tokenAddress: '0x123...abcd',  // LifToken contract address
 *     web3: web3                     // Web3 object instantiated with a provider
 *   })
 */
class User {

  /**
   * Instantiates a User with an Ethereum account address, a LifToken address, and a Web3 instance
   * whose provider has been set.
   * @param  {Object} options
   * @return {User}
   */
  constructor(options){
    this.context = {};
    this.account = options.account || null;
    this.context.web3 = options.web3;
    this.context.gasMargin = options.gasMargin || 1;
    this.token = util.getInstance('LifToken', options.tokenAddress, this.context);
    this.bookings = new BookingData(options.web3);
  }

  /**
   * Private method that composes a non-token booking's data for execution by sendTransaction
   */
  async _compileBooking(hotelAddress, unitAddress, fromDay, daysAmount, guestData){
    const hotel = util.getInstance('Hotel', hotelAddress, this.context);

    const bookData = await hotel.methods
      .book(unitAddress, this.account, fromDay, daysAmount)
      .encodeABI();

    return await hotel.methods
      .beginCall(bookData, guestData)
      .encodeABI();
  }

  /**
   * Private method that composes a token based booking's data for execution by sendTransaction
   */
  async _compileLifBooking(hotelAddress, unitAddress, fromDay, daysAmount, guestData){
    const hotel = util.getInstance('Hotel', hotelAddress, this.context);

    const bookData = await hotel.methods
      .bookWithLif(unitAddress, this.account, fromDay, daysAmount)
      .encodeABI();

    return await hotel.methods
      .beginCall(bookData, guestData)
      .encodeABI();
  }


  /**
   * Initiates a token-payment booking
   * @param  {Address}    hotelAddress  Address of Hotel contract that controls the unit to book
   * @param  {Address}    unitAddress   Address of Unit contract being booked
   * @param  {Date}       fromDate      check in date
   * @param  {Number}     daysAmount    number of days to book
   * @param  {String}     guestData     hex encoded guest data
   * @return {Promievent}
   */
  async bookWithLif(hotelAddress, unitAddress, fromDate, daysAmount, guestData) {
    const fromDay = util.formatDate(fromDate);

    const cost = await this.bookings.getLifCost(unitAddress, fromDay, daysAmount);
    const enough = await this.balanceCheck(cost);
    const available = await this.bookings.unitIsAvailable(unitAddress, fromDate, daysAmount);

    if (!enough)
      return Promise.reject(errors.insufficientBalance);

    if (!available)
      return Promise.reject(errors.notAvailable);

    const bookData = await this._compileLifBooking(
      hotelAddress,
      unitAddress,
      fromDay,
      daysAmount,
      guestData
    );

    const weiCost = util.lif2LifWei(cost, this.context);
    const approvalData = await this.token.methods
      .approveData(hotelAddress, weiCost, bookData)
      .encodeABI();

    const options = {
      from: this.account,
      to: this.token.options.address,
      data: approvalData
    };

    const estimate = await this.context.web3.eth.estimateGas(options);
    options.gas = await util.addGasMargin(estimate, this.context);

    return this.context.web3.eth.sendTransaction(options);
  };

  /**
   * Initiates a non-token booking
   * @param  {Address}    hotelAddress  Address of Hotel contract that controls the unit to book
   * @param  {Address}    unitAddress   Address of Unit contract being booked
   * @param  {Date}       fromDate      check in date
   * @param  {Number}     daysAmount    number of days to book
   * @param  {String}     guestData     hex encoded guest data
   * @return {Promievent}
   */
  async book(hotelAddress, unitAddress, fromDate, daysAmount, guestData){
    const fromDay = util.formatDate(fromDate);

    const data = await this._compileBooking(
      hotelAddress,
      unitAddress,
      fromDay,
      daysAmount,
      guestData
    );

    const options = {
      from: this.account,
      to: hotelAddress,
      data: data
    };

    const estimate = await this.context.web3.eth.estimateGas(options);
    options.gas = await util.addGasMargin(estimate, this.context);

    return this.context.web3.eth.sendTransaction(options);
  }

  /**
   * Returns true if user account's LifToken balance is greater than or equal to
   * a booking's LifToken cost.
   * @param  {Number}  cost    Lif 'ether'
   * @return {Boolean}
   */
  async balanceCheck(cost){
    let weiCost = util.lif2LifWei(cost, this.context);
    weiCost = new this.context.web3.utils.BN(weiCost);

    let balance = await this.token.methods.balanceOf(this.account).call();
    balance = new this.context.web3.utils.BN(balance);

    return balance.gte(weiCost);
  }
}

module.exports = User;

