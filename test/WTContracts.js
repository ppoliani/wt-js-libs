'use strict';

var WTKey = require('../libs/WTKey.js');
var chai = require('chai');
var assert = chai.assert;

var WTKeyIndex = artifacts.require('../contracts/WTKeyIndex.sol');
var WTIndex = artifacts.require('../contracts/WTIndex.sol');
var LifToken = artifacts.require('../contracts/LifToken.sol');
var WTContracts = artifacts.require('../contracts/WTContracts.sol');

const DEBUG = true;

contract('WTContracts', function(accounts) {

  it('Should deploy the contractIndex, deploy keyIndex, register it and edit it', async function() {

    let contractsIndex = await WTContracts.new();
    let keyIndex = await WTKeyIndex.new();
    let lifToken = await LifToken.new();
    let wtIndex = await WTIndex.new();
    await contractsIndex.register('KeyIndex', keyIndex.contract.address, 'http://windingtree.keys.com/', '1.0.0');
    await contractsIndex.register('LifToken', lifToken.contract.address, 'http://windingtree.lif.com/', '1.0.0');
    await contractsIndex.register('Index', wtIndex.contract.address, 'http://windingtree.index.com/', '1.0.0');

    let findByAddr = await contractsIndex.getByAddr(keyIndex.contract.address);
    let findByname = await contractsIndex.getByName('KeyIndex');

    assert.equal(findByAddr[0], findByname[0]);
    assert.equal(findByAddr[1], findByname[1]);
    assert.equal(findByAddr[2], findByname[2]);
    assert.equal(findByAddr[3], findByname[3]);
    assert.equal('KeyIndex', findByAddr[0]);
    assert.equal(keyIndex.contract.address, findByAddr[1]);
    assert.equal('http://windingtree.keys.com/', findByAddr[2]);
    assert.equal('1.0.0', findByAddr[3]);

    assert.equal('LifToken', (await contractsIndex.getByName('LifToken'))[0]);
    assert.equal(lifToken.contract.address, (await contractsIndex.getByName('LifToken'))[1]);
    assert.equal('http://windingtree.lif.com/', (await contractsIndex.getByName('LifToken'))[2]);
    assert.equal('1.0.0', (await contractsIndex.getByName('LifToken'))[3]);
    assert.equal('Index', (await contractsIndex.getByName('Index'))[0]);
    assert.equal(wtIndex.contract.address, (await contractsIndex.getByName('Index'))[1]);
    assert.equal('http://windingtree.index.com/', (await contractsIndex.getByName('Index'))[2]);
    assert.equal('1.0.0', (await contractsIndex.getByName('Index'))[3]);

    await  contractsIndex.edit( 'KeyIndex', keyIndex.contract.address, 'http://windingtree.keys2.com/', '1.0.1');

    findByAddr = await contractsIndex.getByAddr(keyIndex.contract.address);
    findByname = await contractsIndex.getByName('KeyIndex');

    assert.equal(findByAddr[0], findByname[0]);
    assert.equal(findByAddr[1], findByname[1]);
    assert.equal(findByAddr[2], findByname[2]);
    assert.equal(findByAddr[3], findByname[3]);
    assert.equal('KeyIndex', findByAddr[0])
    assert.equal(keyIndex.contract.address, findByAddr[1])
    assert.equal('http://windingtree.keys2.com/', findByAddr[2]);
    assert.equal('1.0.1', findByAddr[3]);

  });

});
