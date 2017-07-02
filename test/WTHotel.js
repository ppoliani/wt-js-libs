'use strict';

var chai = require('chai');
var assert = chai.assert;

var WTHotelLib = require('../libs/WTHotel.js');
var wtHotelLib = new WTHotelLib({ wallet: {web3Provider: 'http://localhost:8545'}});

var web3 = wtHotelLib.web3;

const DEBUG = true;

describe('WT Hotel Lib', function() {
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

  it('Should create a wallet and fund it.', async function() {
    await wtHotelLib.wallet.createWallet('password123');
    await web3.eth.sendTransaction({from: web3.eth.accounts[0], to: wtHotelLib.wallet.address, value: web3.toWei(5, 'ether')});
    assert.equal(web3.eth.getBalance(wtHotelLib.wallet.address), web3.toWei(5, 'ether'));
  });

  it('Should create a hotel, edit his info, address and ubication.', async function() {
    await wtHotelLib.wallet.createWallet('password123');
    await web3.eth.sendTransaction({from: web3.eth.accounts[0], to: wtHotelLib.wallet.address, value: web3.toWei(5, 'ether')});
    assert.equal(web3.eth.getBalance(wtHotelLib.wallet.address), web3.toWei(5, 'ether'));
    wtHotelLib.setIndex(indexAddress);
    await wtHotelLib.createHotel('password123', 'WTHotel', 'Winding Tree Hotel');
    await wtHotelLib.updateHotels();
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].name, 'WTHotel');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].description, 'Winding Tree Hotel');
    await wtHotelLib.changeHotelInfo('password123', wtHotelLib.hotelsAddrs[0], 'Awesome WTHotel', 'Awesome Winding Tree Hotel');
    await wtHotelLib.changeHotelAddress('password123', wtHotelLib.hotelsAddrs[0], 'Address one', 'Address two', '666', 'Spain');
    await wtHotelLib.changeHotelLocation('password123', wtHotelLib.hotelsAddrs[0], 1, wtHotelLib.utils.parseLongitude(15), wtHotelLib.utils.parseLatitude(50));
    await wtHotelLib.updateHotels();
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].name, 'Awesome WTHotel');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].description, 'Awesome Winding Tree Hotel');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].lineOne, 'Address one');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].lineTwo, 'Address two');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].zip, '666');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].country, 'Spain');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].timezone, '1');
    assert.equal(wtHotelLib.utils.formatLongitude(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].longitude), 15);
    assert.equal(wtHotelLib.utils.formatLatitude(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].latitude), 50);
  });

  it('Should create a hotel, create a unit type an upload new units and edit them.', async function() {
    await wtHotelLib.wallet.createWallet('password123');
    await web3.eth.sendTransaction({from: web3.eth.accounts[0], to: wtHotelLib.wallet.address, value: web3.toWei(5, 'ether')});
    assert.equal(web3.eth.getBalance(wtHotelLib.wallet.address), web3.toWei(5, 'ether'));
    wtHotelLib.setIndex(indexAddress);
    await wtHotelLib.createHotel('password123', 'WTHotel', 'Winding Tree Hotel');
    await wtHotelLib.updateHotels();
    await wtHotelLib.addUnitType('password123', wtHotelLib.hotelsAddrs[0], 'BASIC');
    await wtHotelLib.addUnit('password123', wtHotelLib.hotelsAddrs[0], 'BASIC', 'Room1', 'Basic Room', 1, 3, '10 USD');
    await wtHotelLib.editUnit('password123', wtHotelLib.hotelsAddrs[0], 'BASIC', 1, 'BasicRoom1', 'Basic Room 1', 1, 2, '12 USD');
    await wtHotelLib.updateHotels();
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].name, 'WTHotel');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].description, 'Winding Tree Hotel');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].lineOne, '');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].lineTwo, '');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].zip, '');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].country, '');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].units.length, 1);
  });

  it('Should create a hotel, edit his info, address and ubication, create a unit type, upload new units edit them and book them.', async function() {
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
    await wtHotelLib.addUnitType('password123', wtHotelLib.hotelsAddrs[0], 'GOLD');
    await wtHotelLib.addUnitType('password123', wtHotelLib.hotelsAddrs[0], 'PLATINUM');
    await wtHotelLib.addUnit('password123', wtHotelLib.hotelsAddrs[0], 'BASIC', 'Room1', 'Basic Room', 1, 3, '10 USD');
    await wtHotelLib.addUnit('password123', wtHotelLib.hotelsAddrs[0], 'BASIC', 'Room2', 'Basic Room', 1, 3, '10 USD');
    await wtHotelLib.addUnit('password123', wtHotelLib.hotelsAddrs[0], 'BASIC', 'Room3', 'Basic Room', 1, 3, '10 USD');
    await wtHotelLib.addUnit('password123', wtHotelLib.hotelsAddrs[0], 'BASIC', 'Room4', 'Basic Room', 1, 3, '10 USD');
    await wtHotelLib.addUnit('password123', wtHotelLib.hotelsAddrs[0], 'BASIC', 'Room5', 'Basic Room', 1, 3, '10 USD');
    await wtHotelLib.addUnit('password123', wtHotelLib.hotelsAddrs[0], 'GOLD', 'Room6', 'Gold Room', 2, 4, '30 USD');
    await wtHotelLib.addUnit('password123', wtHotelLib.hotelsAddrs[0], 'GOLD', 'Room7', 'Gold Room', 2, 4, '30 USD');
    await wtHotelLib.addUnit('password123', wtHotelLib.hotelsAddrs[0], 'GOLD', 'Room8', 'Gold Room', 2, 4, '30 USD');
    await wtHotelLib.addUnit('password123', wtHotelLib.hotelsAddrs[0], 'PLATINUM', 'Room9', 'Platinum Room', 2, 5, '50 USD');
    await wtHotelLib.updateHotels();
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].name, 'Awesome WTHotel');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].description, 'Awesome Winding Tree Hotel');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].lineOne, 'Address one');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].lineTwo, 'Address two');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].zip, '666');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].country, 'Spain');
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].timezone, '1');
    assert.equal(wtHotelLib.utils.formatLongitude(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].longitude), 15);
    assert.equal(wtHotelLib.utils.formatLatitude(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].latitude), 50);
    assert.equal(wtHotelLib.hotels[wtHotelLib.hotelsAddrs[0]].units.length, 9);
  });

});
