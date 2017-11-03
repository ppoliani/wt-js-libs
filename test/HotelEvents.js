const User = require('../libs/User');
const util = require('../libs/util/index');
const help = require('./helpers/index');

const assert = require('chai').assert;
const _ = require('lodash');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);

let HotelEvents;

(process.env.TEST_BUILD)
  ? HotelEvents = require('../dist/node/HotelEvents.js')
  : HotelEvents = require('../libs/HotelEvents.js');

describe('HotelEvents', function() {
  let Manager;
  let token;
  let index;
  let accounts;
  let ownerAccount;
  let augusto;
  let hotelAddress;
  let unitAddress;
  let hotelEvents;

  before(async function(){
    accounts = await web3.eth.getAccounts();
    ({
      index,
      token,
      wallet
    } = await help.createWindingTreeEconomy(accounts, web3));

    ownerAccount = wallet["1"].address;
    augusto = wallet["2"].address;
  })

  describe('subscribe', function() {
    const fromDate = new Date('10/10/2020');
    const daysAmount = 5;
    const price = 1;
    const guestData = web3.utils.toHex('guestData');

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
      hotelEvents = new HotelEvents(web3);

      hotel = util.getInstance('Hotel', hotelAddress, {web3: web3});
      await Manager.setDefaultLifPrice(hotelAddress, unitAddress, price);
    });

    it.skip('should subscribe to one hotels events and hear a Book event', async (done) => {
      hotelEvents.subscribe(hotelAddress);
      hotelEvents.on('Book', event => {
        assert.isString(event.transactionHash);
        assert.isNumber(event.blockNumber);
        assert.isString(event.id);

        assert.equal(event.address, hotel.options.address);
        assert.equal(event.from, user.account);
        assert.equal(event.fromDate.toString(), fromDate.toString());
        assert.equal(event.unit, unitAddress);
        assert.equal(event.daysAmount, daysAmount);
        done();
      });

      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
    });

    it.skip('should subscribe to one hotels events and hear a Book event');
    it.skip('should subscribe to many hotels events and hear many Book events');
    it.skip('should hear a CallStarted event');
    it.skip('should hear a CallFinish event');
  });
});

