const assert = require('chai').assert;
const help = require('./helpers/index');
const util = require('./../libs/util/index');
const BookingData = require('./../libs/BookingData');
const User = require('./../libs/User');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);

(process.argv.indexOf('test-build') > 0)
  ? HotelManager = require('../dist/node/HotelManager.js')
  : HotelManager = require('../libs/HotelManager.js');

describe('BookingData', function() {
  let Manager;
  let Data;
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

    index = await util.deployIndex({
      owner: daoAccount,
      gasMargin: 1.5,
      web3: web3
    });

    Data = new BookingData(web3);
  })

  beforeEach(async function() {
    ({
      Manager,
      hotelAddress,
      unitAddress
    } = await help.generateCompleteHotel(index.options.address, ownerAccount, 1.5, web3));

    //token = await help.runTokenGenerationEvent();
  });

  describe('getCost', function(){
    it('gets the total cost for a booking over a range of days', async () => {
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;
      const price = 100.00;
      const expectedCost = price * daysAmount;

      await Manager.setDefaultPrice(hotelAddress, unitAddress, price);
      const actualCost = await Data.getCost(unitAddress, fromDate, daysAmount);

      assert.equal(expectedCost, actualCost);
    })
  });

  describe('getLifCost', function(){
    it('gets the total cost for a booking over a range of days', async () => {
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;
      const price = 20;
      const expectedCost = price * daysAmount;

      await Manager.setDefaultLifPrice(hotelAddress, unitAddress, price);
      const actualCost = await Data.getLifCost(unitAddress, fromDate, daysAmount);

      assert.equal(expectedCost, actualCost);
    })
  });

  describe.skip('unitIsAvailable', function() {
    before( async () => {
      token = await help.runTokenGenerationEvent();

      const fundingOptions = {
        token: token,
        sender: fundingSource,
        receiver: augusto,
        value: 500,
        web3: web3
      }

      await help.sendTokens(fundingOptions);
    });

    it('returns true if unit is available for a range of days', async () => {

    });

    it('returns false if unit has been booked for any day in a range of days', async () => {

    });

    it('returns false if the units active status is false', async () => {

    });
  });

  describe.skip('getBookings', function() {

    it('gets bookings for a hotel', async() => {

    });

    it('gets bookings for two hotels', async() => {

    });

    it('gets bookings for a hotel starting from a specific block number', async() => {

    });

    it('returns an empty array if there are no bookings', async() => {

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






