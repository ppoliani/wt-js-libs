'use strict';

var chai = require('chai');
var assert = chai.assert;

var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

var WTHotelLib = require('../libs/WTHotel.js');
var wtHotelLib = new WTHotelLib({});

const DEBUG = true;

describe('WT Hotel Lib', function() {
  this.timeout(0);
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

  it('Should create a hotel, edit it, and update inventory', async function() {
    await wtHotelLib.wallet.createWallet('password123');
    await web3.eth.sendTransaction({from: web3.eth.accounts[0], to: wtHotelLib.wallet.address, value: web3.toWei(5, 'ether')});
    assert.equal(web3.eth.getBalance(wtHotelLib.wallet.address), web3.toWei(5, 'ether'));
    wtHotelLib.setIndex(indexAddress);
    await wtHotelLib.createHotel('password123', 'WTHotel', 'Winding Tree Hotel');
    await wtHotelLib.updateHotels();
    console.log(wtHotelLib.hotelsAddrs);
    console.log(wtHotelLib.hotels);
    await wtHotelLib.changeHotelInfo('password123', wtHotelLib.hotelsAddrs[0], 'Awesome Winding Tree Hotel');
    await wtHotelLib.changeHotelAddress('password123', wtHotelLib.hotelsAddrs[0], 'Address one', 'Address two', '666', 'Spain');
    await wtHotelLib.updateHotels();
    console.log(wtHotelLib.hotels);
  });

});
