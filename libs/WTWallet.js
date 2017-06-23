
var ethLightWallet = require('eth-lightwallet');
var Web3 = require('web3');
var EthereumTx = require('ethereumjs-tx');

var WTWallet = function(options){

  // Web3
  this.web3 = new Web3(new Web3.providers.HttpProvider(options.web3Provider || 'http://localhost:8545'));

  // Extend form EthLightWallet
  Object.assign(this, ethLightWallet);

  this.setKeystore = function(ks){
    this.keystore = ethLightWallet.keystore.deserialize(ks);
    this.address = '0x'+this.keystore.ksData["m/0'/0'/0'"].addresses[0];
  }

  this.importWallet = function(ks, password){
    var self = this;
    return new Promise(function(resolve, reject){
      self.keystore = ethLightWallet.keystore.deserialize(ks);
      self.keystore.keyFromPassword(password, function (err, pwDerivedKey) {
        if (err)
          reject(err);
        self.keystore.generateNewAddress(pwDerivedKey, 1);
        self.address = '0x'+self.keystore.getAddresses()[0];
        resolve();
      });
    });
  }

  this.createWallet = function(password){
    var self = this;
    return new Promise(function(resolve, reject){
      ethLightWallet.keystore.createVault({
        password: password
      }, function(err, ks) {
        if (err)
          reject(err);
        else{
          self.keystore = ks;
          self.keystore.keyFromPassword(password, function (err, pwDerivedKey) {
            if (err)
              reject(err);
            self.keystore.generateNewAddress(pwDerivedKey, 1);
            self.address = '0x'+self.keystore.getAddresses()[0];
            resolve(self.keystore);
          });
        }
      });
    });
  }

  this.closeWallet = function(){
    this.keystore = {};
    this.address = '';
  }

  this.getSeed = function(password){
    var self = this;
    return new Promise(function(resolve, reject){
      console.log('Unlocking account');
      self.keystore.keyFromPassword(password, function (err, pwDerivedKey) {
        if (err)
          reject(err);
        resolve(self.keystore.getSeed(pwDerivedKey));
      });
    });
  }

  this.unlockAccount = function(password){
    var self = this;
    return new Promise(function(resolve, reject){
      console.log('Unlocking account');
      self.keystore.keyFromPassword(password, function (err, pwDerivedKey) {
        if (err)
          reject(err);
        if (!self.address){
          self.keystore.generateNewAddress(pwDerivedKey, 1);
          self.address = '0x'+self.keystore.getAddresses()[0];
        }
        var pvKey = self.keystore.exportPrivateKey(self.address, pwDerivedKey)
        resolve(pvKey);
      });
    });
  }

  this.signTx = function(password, rawTx){
    var self = this;
    return new Promise(function(resolve, reject){
      console.log('Unlocking account and signing rawTx');
      self.keystore.keyFromPassword(password, function (err, pwDerivedKey) {
        if (!self.address){
          self.keystore.generateNewAddress(pwDerivedKey, 1);
          self.address = '0x'+self.keystore.getAddresses()[0];
        }
        var signedTx = self.signing.signTx(self.keystore, pwDerivedKey, rawTx, self.address);
        resolve(signedTx);
      });
    });
  }

  this.sendTx = async function(password, txParams){
    var self = this;
    if (!txParams.gasLimit)
      txParams.gasLimit = self.web3.eth.estimateGas({data: txParams.data, to : txParams.to, from: self.address})+1000;

    if (!txParams.nonce)
      txParams.nonce = self.web3.toHex(self.web3.eth.getTransactionCount(self.address));

    if (!txParams.value)
      txParams.value = '0x00';

    const privateKey = Buffer.from( await self.unlockAccount(password) , 'hex');
    const tx = new EthereumTx(txParams);
    tx.sign(privateKey);
    const serializedTx = '0x'+tx.serialize().toString('hex');
    const txHash = self.web3.eth.sendRawTransaction(serializedTx);
    console.log('TX:', txParams, ', hash:', txHash);
    var txSent = await self.waitForTX(txHash);
    return txSent;
  }

  this.isTXMined = function(txHash){
    var self = this;
    if (!self.web3.eth.getTransaction(txHash))
      return false;
    var txBlock = self.web3.eth.getTransaction(txHash).blockNumber;
    if ((txBlock !== null) && (parseInt(txBlock) <= parseInt(self.web3.eth.blockNumber)))
      return true;
    else
      return false;
  }

  this.waitForTX = function(txHash) {
    var self = this;
    return new Promise(function (resolve, reject){
      var wait = setInterval( function() {
        try{
          if ( self.isTXMined(txHash)) {
            clearInterval(wait);
            resolve(self.web3.eth.getTransactionReceipt(txHash));
          }
        } catch(e){
          reject(e);
        }
      }, 1000 );
    });
  }

  this.getTxs = function(options) {
    var self = this;
    const address = (options && options.address) ? options.address : self.address;
    const searchTo = (options && options.to) ? options.to : true;
    const searchFrom = (options && options.from) ? options.from : true;
    const endBlockNumber = self.web3.eth.blockNumber;
    var txs = [];
    for (var i = endBlockNumber; i >= 0; i--) {
      var block = self.web3.eth.getBlock(i, true);
      if (block != null && block.transactions != null) {
        block.transactions.forEach( function(t) {
          if ((searchFrom && address == t.from) || (searchTo && address == t.to)) {
            t.receipt = self.web3.eth.getTransactionReceipt(t.hash);
            txs.push(t);
          }
        })
      }
    }
    return txs;
  }

};

module.exports = WTWallet;
