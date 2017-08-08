'use strict';

var chai = require('chai');
var assert = chai.assert;

var WTHotelLib, WTUserLib;
if (process.argv.indexOf('test-build') > 0){
  console.log('Testing build..');
  WTHotelLib = require('../dist/node/WTHotel.js');
  WTUserLib = require('../dist/node/WTUser.js');
} else {
  WTHotelLib = require('../libs/WTHotel.js');
  WTUserLib = require('../libs/WTUser.js');
}

var wtHotelLib = new WTHotelLib({ wallet: {web3Provider: 'http://localhost:8545'}});

var wtUserLib = new WTUserLib({ wallet: {web3Provider: 'http://localhost:8545'}});

var web3 = wtHotelLib.web3;

const DEBUG = true;

describe('WT User Lib', function() {
  this.timeout(120000);
  let indexAddress = "0x0";

  beforeEach(function() {
    let data = web3.eth.contract(wtHotelLib.contracts.WTIndex.abi).new.getData({data: wtHotelLib.contracts.WTIndex.unlinked_binary});
    var estimatedGas = web3.eth.estimateGas({data: data})+1000;
    return new Promise(function(resolve, reject){
      web3.eth.contract(wtHotelLib.contracts.WTIndex.abi).new({data: data, gas: estimatedGas, from: web3.eth.accounts[0]}, function(err, indexContract){
        if (indexContract.address){
          indexAddress = indexContract.address;
          resolve();
        }
      });
    });
  });

  it('Should create a hotel, edit his info, address and ubication, create a unit type, upload a unit, and book it.', async function() {
    await wtHotelLib.wallet.createWallet('password123');
    await web3.eth.sendTransaction({from: web3.eth.accounts[0], to: wtHotelLib.wallet.address, value: web3.toWei(5, 'ether')});
    assert.equal(web3.eth.getBalance(wtHotelLib.wallet.address), web3.toWei(5, 'ether'));
    wtHotelLib.setIndex(indexAddress);
    await wtHotelLib.createHotel('password123', 'WTHotel', 'Winding Tree Hotel');
    await wtHotelLib.updateHotels();
    await wtHotelLib.changeHotelInfo('password123', wtHotelLib.hotelsAddrs[0], 'Awesome WTHotel', 'Awesome Winding Tree Hotel');
    await wtHotelLib.changeHotelAddress('password123', wtHotelLib.hotelsAddrs[0], 'Address one', 'Address two', '666', 'Spain');
    await wtHotelLib.changeHotelLocation('password123', wtHotelLib.hotelsAddrs[0], 1, wtHotelLib.utils.parseLongitude(15), wtHotelLib.utils.parseLatitude(50));
    await wtHotelLib.addUnitType('password123', wtHotelLib.hotelsAddrs[0], 'BASIC');
    await wtHotelLib.addUnit('password123', wtHotelLib.hotelsAddrs[0], 'BASIC');
    await wtHotelLib.updateHotels();
    let hotel = wtHotelLib.getHotel(wtHotelLib.hotelsAddrs[0]);
    assert.equal(hotel.name, 'Awesome WTHotel');
    assert.equal(hotel.description, 'Awesome Winding Tree Hotel');
    assert.equal(hotel.lineOne, 'Address one');
    assert.equal(hotel.lineTwo, 'Address two');
    assert.equal(hotel.zip, '666');
    assert.equal(hotel.country, 'Spain');
    assert.equal(hotel.timezone, '1');
    assert.equal(wtHotelLib.utils.formatLongitude(hotel.longitude), 15);
    assert.equal(wtHotelLib.utils.formatLatitude(hotel.latitude), 50);
    assert.equal(hotel.units.length, 1);

    await wtUserLib.wallet.createWallet('password123');
    await web3.eth.sendTransaction({from: web3.eth.accounts[0], to: wtUserLib.wallet.address, value: web3.toWei(5, 'ether')});
    assert.equal(web3.eth.getBalance(wtUserLib.wallet.address), web3.toWei(5, 'ether'));
    wtUserLib.setIndex(indexAddress);
    await wtUserLib.updateHotels();
    await wtUserLib.bookUnit('password123', wtUserLib.hotels[ wtUserLib.hotelsAddrs[0] ].units[0].address, 102, 6, "Test Private Data");
    const bookings = await wtUserLib.getBookings();
    assert.equal(bookings[0].from, wtUserLib.wallet.address);
    assert.equal(bookings[0].to, wtUserLib.hotels[ wtUserLib.hotelsAddrs[0] ].units[0].address);
    assert.equal(bookings[0].unitType, 'BASIC');
    assert.equal(bookings[0].privateData, 'Test Private Data');
  });

});
