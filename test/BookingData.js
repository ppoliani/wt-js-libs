const User = require('../libs/User');
const BookingData = require('../libs/BookingData');

const util = require('../libs/util/index');
const help = require('./helpers/index');

const assert = require('chai').assert;
const _ = require('lodash');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);

(process.argv.indexOf('test-build') > 0)
  ? HotelManager = require('../dist/node/HotelManager.js')
  : HotelManager = require('../libs/HotelManager.js');

describe.only('BookingData', function() {
  const defaultGas = 400000;

  let Manager;
  let token;
  let index;
  let accounts;
  let fundingSource;
  let daoAccount;
  let ownerAccount;
  let augusto;
  let jakub;
  let hotelAddress;
  let unitAddress;

  before(async function(){
    const wallet = await web3.eth.accounts.wallet.create(4);
    accounts = await web3.eth.getAccounts();

    fundingSource = accounts[0];
    ownerAccount = wallet["0"].address;
    daoAccount = wallet["1"].address;
    augusto = wallet["2"].address;
    jakub = wallet["3"].address;

    await util.fundAccount(fundingSource, ownerAccount, 50, web3);
    await util.fundAccount(fundingSource, daoAccount, 50, web3);
    await util.fundAccount(fundingSource, augusto, 50, web3);
    await util.fundAccount(fundingSource, jakub, 50, web3);

    index = await util.deployIndex({
      owner: daoAccount,
      gasMargin: 1.5,
      web3: web3
    });

    token = await help.runTokenGenerationEvent();

    const setLifData = await index.methods
      .setLifToken(token.options.address)
      .encodeABI();

    const setLifOptions = {
      from: daoAccount,
      to: index.options.address,
      gas: defaultGas,
      data: setLifData
    };

    await web3.eth.sendTransaction(setLifOptions);

    tokenFundingOptions = {
      token: token,
      sender: fundingSource,
      value: 500,
      web3: web3
    };

    tokenFundingOptions.receiver = augusto;
    await help.sendTokens(tokenFundingOptions);

    tokenFundingOptions.receiver = jakub;
    await help.sendTokens(tokenFundingOptions);
  })

  beforeEach( async function() {
    ({
      Manager,
      hotelAddress,
      unitAddress
    } = await help.generateCompleteHotel(index.options.address, ownerAccount, 1.5, web3));

    userOptions = {
      account: augusto,
      gasMargin: 1.5,
      tokenAddress: token.options.address,
      web3: web3
    }

    user = new User(userOptions);
    data = new BookingData(web3);
    hotel = util.getInstance('Hotel', hotelAddress, {web3: web3});
  })

  describe('getCost | getLifCost', function(){

    it('getCost: gets the total cost for a booking over a range of days', async () => {
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;
      const price = 100.00;
      const expectedCost = price * daysAmount;

      await Manager.setDefaultPrice(hotelAddress, unitAddress, price);
      const actualCost = await data.getCost(unitAddress, fromDate, daysAmount);

      assert.equal(expectedCost, actualCost);
    })

    it('getLifCost gets the total cost for a booking over a range of days', async () => {
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;
      const price = 20;
      const expectedCost = price * daysAmount;

      await Manager.setDefaultLifPrice(hotelAddress, unitAddress, price);
      const actualCost = await data.getLifCost(unitAddress, fromDate, daysAmount);

      assert.equal(expectedCost, actualCost);
    })
  });

  describe('getBookings', function() {
    const fromDate = new Date('10/10/2020');
    const daysAmount = 5;
    const price = 1;
    const guestData = web3.utils.toHex('guestData');

    it('gets a booking for a hotel', async() => {
      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      const bookings = await data.getBookings(hotelAddress);
      const booking = bookings[0];

      assert.equal(bookings.length, 1);
      assert.isString(booking.transactionHash);
      assert.isNumber(booking.blockNumber);
      assert.isString(booking.id);
      assert.equal(booking.from, user.account);
      assert.equal(booking.fromDate.toString(), fromDate.toString());
      assert.equal(booking.unit, unitAddress);
      assert.equal(booking.daysAmount, daysAmount);
    });

    it('gets bookings for two hotels', async() => {
      const hotelTwo = await help.generateCompleteHotel(
        index.options.address,
        ownerAccount,
        1.5,
        web3
      );
      const hotelAddressTwo = hotelTwo.hotelAddress;
      const unitAddressTwo = hotelTwo.unitAddress;

      jakubOptions = {
        account: jakub,
        gasMargin: 1.5,
        tokenAddress: token.options.address,
        web3: web3
      }

      const jakubUser = new User(jakubOptions);

      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );

      await jakubUser.bookWithLif(
        hotelAddressTwo,
        unitAddressTwo,
        fromDate,
        daysAmount,
        guestData
      );

      const bookings = await data.getBookings([hotelAddress, hotelAddressTwo]);
      assert.equal(bookings.length, 2);
      const augustoBooking = bookings.filter(item => item.from === augusto);
      const jakubBooking = bookings.filter(item => item.from === jakub);

      assert.isDefined(augustoBooking);
      assert.isDefined(jakubBooking);
    });

    it('gets bookings for a hotel starting from a specific block number', async() => {
      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      let bookings = await data.getBookings(hotelAddress);
      const firstBooking = bookings[0];

      assert.equal(bookings.length, 1);

      blockNumber = await web3.eth.getBlockNumber();
      blockNumber += 1;

      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        new Date('10/10/2021'),
        daysAmount,
        guestData
      );

      bookings = await data.getBookings(hotelAddress, blockNumber);
      const secondBooking = bookings[0];

      assert.isDefined(firstBooking);
      assert.isDefined(secondBooking);
      assert.notDeepEqual(firstBooking, secondBooking);
    });

    it('returns an empty array if there are no bookings', async() => {
      const bookings = await data.getBookings(hotelAddress);
      assert.isArray(bookings);
      assert.equal(bookings.length, 0);
    });
  });

  describe.skip('getBookingRequests', function(){

    it('gets booking requests for a hotel', async() => {

    });

    it('gets bookings requests for two hotels', async() => {

    });

    it('gets bookings for a hotel starting from a specific block number', async() => {

    });

    it('filters out completed booking requests', async() => {

    });

    it('returns an empty array if there are no bookings', async() => {

    })
  })
});






