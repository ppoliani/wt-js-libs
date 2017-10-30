const util = require('./util/index');
const errors = require('./util/errors');
const BookingData = require('./BookingData');

class User {

  constructor(options){
    this.context = {};
    this.account = options.account || null;
    this.context.web3 = options.web3;
    this.context.gasMargin = options.gasMargin || 1;
    this.token = util.getInstance('LifToken', options.tokenAddress, this.context);
    this.bookings = new BookingData(options.web3);
  }

  async _compileBooking(unitAddress, fromDay, daysAmount, guestData){
    const hotel = util.getInstance('Hotel', hotelAddress, this.context);

    const bookData = await hotel.methods
      .book(unitAddress, fromDay, daysAmount)
      .encodeABI();

    return await hotel.methods
      .beginCall(bookData, guestData)
      .encodeABI();
  }

  async _compileLifBooking(hotelAddress, unitAddress, fromDay, daysAmount, guestData){
    const hotel = util.getInstance('Hotel', hotelAddress, this.context);

    const bookData = await hotel.methods
      .bookWithLif(unitAddress, this.account, fromDay, daysAmount)
      .encodeABI();

    return await hotel.methods
      .beginCall(bookData, guestData)
      .encodeABI();
  }

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

    const approvalData = await this.token.methods
      .approveData(hotelAddress, cost, bookData)
      .encodeABI();

    const options = {
      from: this.account,
      to: this.token.options.address,
      data: approvalData
    };

    const estimate = await this.context.web3.eth.estimateGas(options);
    options.gas = util.addGasMargin(estimate, this.context);

    return this.context.web3.eth.sendTransaction(options);
  };

  async book(hotelAddress, unitAddress, checkIn, daysAmount, guestData){

  }

  /**
   * Returns true if user accounts balance is greater than or equal to cost, false otherwise
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