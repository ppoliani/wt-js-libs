'use strict';

var WTHotelLib = require('../dist/WTHotel.min.js');
console.log(WTHotelLib);
var chai = require('chai');
var assert = chai.assert;

var WTIndex = artifacts.require('../contracts/WTIndex.sol');
var WTContracts = artifacts.require('../contracts/WTContracts.sol');

const DEBUG = true;

contract('WT Hotel Lib', function(accounts) {

  let contractRegistry = "0x0";

  beforeEach( async function() {
    let contractsIndex = await WTContracts.new();
    let wtIndex = await WTIndex.new();
    await contractsIndex.register('Index', wtIndex.contract.address, 'http://windingtree.index.com/', '1.0.0');
    contractRegistry = contractsIndex.address;
  });

  it('Should create a hotel, edit it, and update inventory', async function() {

    var wtHotelLib = new WTHotelLib({});

    await wtHotelLib.wallet.createWallet('password123');
    await web3.eth.sendTransaction({from: web3.eth.accounts[0], to: wtHotelLib.wallet.address, value: web3.toWei(5, 'ether')});
    assert.equal(web3.eth.getBalance(wtHotelLib.wallet.address), web3.toWei(5, 'ether'));

  });

});
