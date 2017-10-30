const User = require('../libs/User');
const BookingData = require('../libs/BookingData');

const util = require('../libs/util/index');
const help = require('./helpers/index');

const assert = require('chai').assert;
const _ = require('lodash');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);

describe('User', function(){
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

    await index.methods
      .setLifToken(token.options.address)
      .send({from: daoAccount, gas: defaultGas});

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

  describe('balanceCheck', function(){
    let user;

    beforeEach(async () => {
      userOptions = {
        account: augusto,
        tokenAddress: token.options.address,
        web3: web3
      }
      user = new User(userOptions);
    })

    it('should return true if balance is greater than cost', async () => {
      const cost = 50;
      const canPay = await user.balanceCheck(cost);
      assert.isTrue(canPay);
    })

    it('should return false if balance is lower than cost', async() => {
      const cost = 5000;
      const canPay = await user.balanceCheck(cost);
      assert.isFalse(canPay);
    })
  })

  describe.skip('book', function() {
    it('should make a booking', async () => {

    });
  });

  describe('bookWithLif: success cases', function () {
    const fromDate = new Date('10/10/2020');
    const daysAmount = 5;
    const price = 20;
    const guestData = web3.utils.toHex('guestData');
    const expectedCost = price * daysAmount;

    let user;
    let data;
    let hotel;

    beforeEach(async function() {
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
      //await Manager.setDefaultLifPrice(hotelAddress, unitAddress, price);
    });

    it('should make a booking: event fired', async () => {
      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );

      const events = await hotel.getPastEvents('Book');
      const book = events[0].returnValues;
      assert.equal(book.from, augusto);
      assert.equal(book.unit, unitAddress);
      assert.equal(book.fromDay, util.formatDate(fromDate));
      assert.equal(book.daysAmount, daysAmount);
    });

    it.skip('should make a booking: days reserved', async () => {

      let isAvailable = await data.unitIsAvailable(unitAddress, fromDate, daysAmount);

      assert.isTrue(isAvailable);

      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );

      isAvailable = await data.unitIsAvailable(unitAddress, fromDate, daysAmount);
      assert.isFalse(isAvailable);
    });

    it.skip('should make a booking: tokens transferred', async () => {

    });
  });

  describe.skip('bookWithLif: error cases', function () {
    it('should reject if the room is not available for the range of dates', async () => {

    });

    it('should reject if the users balance is insufficient', async () => {

    });

    it('should not transfer tokens', async () => {

    });
  });
});