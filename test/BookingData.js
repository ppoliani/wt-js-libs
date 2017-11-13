const User = require('../libs/User');
const BookingData = require('../libs/BookingData');

const util = require('../libs/util/index');
const help = require('./helpers/index');

const assert = require('chai').assert;
const _ = require('lodash');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);

(process.env.TEST_BUILD)
  ? HotelManager = require('../dist/node/HotelManager.js')
  : HotelManager = require('../libs/HotelManager.js');

describe('BookingData', function() {
  let Manager;
  let token;
  let index;
  let accounts;
  let ownerAccount;
  let augusto;
  let jakub;
  let hotelAddress;
  let unitAddress;

  before(async function(){
    accounts = await web3.eth.getAccounts();
    ({
      index,
      token,
      wallet
    } = await help.createWindingTreeEconomy(accounts, web3));

    ownerAccount = wallet["1"].address;
    augusto = wallet["2"].address;
    jakub = wallet["3"].address;
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
    const guestData = 'guestData';

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

      assert.equal(booking.guestData, guestData);
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

  describe('getBookingRequests', function(){
    const fromDate = new Date('10/10/2020');
    const daysAmount = 5;
    const price = 1;
    const guestData = 'guestData';

    beforeEach(async () => await Manager.setRequireConfirmation(hotelAddress, true));

    it('gets pending booking requests for a hotel', async() => {
      await user.book(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      const requests = await data.getBookingRequests(hotelAddress);
      const request = requests[0];

      assert.equal(requests.length, 1);
      assert.isString(request.transactionHash);
      assert.isNumber(request.blockNumber);
      assert.isString(request.id);
      assert.isString(request.dataHash);

      assert.equal(request.guestData, guestData);
      assert.equal(request.from, user.account);
    });

    it('gets booking requests for two hotels', async() => {

      const hotelTwo = await help.generateCompleteHotel(
        index.options.address,
        ownerAccount,
        1.5,
        web3
      );
      const managerTwo = hotelTwo.Manager;
      const hotelAddressTwo = hotelTwo.hotelAddress;
      const unitAddressTwo = hotelTwo.unitAddress;

      await managerTwo.setRequireConfirmation(hotelAddressTwo, true);

      jakubOptions = {
        account: jakub,
        gasMargin: 1.5,
        tokenAddress: token.options.address,
        web3: web3
      }

      const jakubUser = new User(jakubOptions);

      await user.book(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );

      await jakubUser.book(
        hotelAddressTwo,
        unitAddressTwo,
        fromDate,
        daysAmount,
        guestData
      );

      const requests = await data.getBookingRequests([hotelAddress, hotelAddressTwo]);
      assert.equal(requests.length, 2);
      const augustoBooking = requests.filter(item => item.from === augusto);
      const jakubBooking = requests.filter(item => item.from === jakub);

      assert.isDefined(augustoBooking);
      assert.isDefined(jakubBooking);
    });

    it('gets booking requests for a hotel starting from a specific block number', async() => {
      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      let requests = await data.getBookingRequests(hotelAddress);
      const firstRequest = requests[0];

      assert.equal(requests.length, 1);

      blockNumber = await web3.eth.getBlockNumber();
      blockNumber += 1;

      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        new Date('10/10/2021'),
        daysAmount,
        guestData
      );

      requests = await data.getBookingRequests(hotelAddress, blockNumber);
      const secondRequest = requests[0];

      assert.isDefined(firstRequest);
      assert.isDefined(secondRequest);
      assert.notDeepEqual(firstRequest, secondRequest);
    });

    it('filters out completed booking requests', async() => {
      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      let requests = await data.getBookingRequests(hotelAddress);
      assert.equal(requests.length, 1);
      const firstRequest = requests[0];

      await Manager.confirmBooking(hotelAddress, firstRequest.dataHash);

      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        new Date('10/10/2021'),
        daysAmount,
        guestData
      );

      requests = await data.getBookingRequests(hotelAddress);
      assert.equal(requests.length, 1);
      const secondRequest = requests[0];

      assert.isDefined(firstRequest);
      assert.isDefined(secondRequest);
      assert.notDeepEqual(firstRequest, secondRequest);
    });

    it('returns an empty array if there are no bookings', async() => {
      const requests = await data.getBookingRequests(hotelAddress);
      assert.isArray(requests);
      assert.equal(requests.length, 0);
    });
  })
});
