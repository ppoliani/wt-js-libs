const utf8 = require('utf8');

const WTIndexContract = require('../../build/contracts/WTIndex.json');
const HotelContract = require('../../build/contracts/Hotel.json');
const UnitTypeContract = require('../../build/contracts/UnitType.json');
const UnitContract = require('../../build/contracts/Unit.json');
const AsyncCallContract = require('../../build/contracts/AsyncCall.json');
const LifTokenContract = require('../../build/contracts/LifToken.json');

const abiDecoder = require('abi-decoder');
const moment = require('moment');
const request = require('superagent');
const currencyCodes = require('currency-codes');
const print = JSON.stringify;

// -------------------------- ABI Decoder / ABI Tables / Binaries ----------------------------------

abiDecoder.addABI(AsyncCallContract.abi);
abiDecoder.addABI(LifTokenContract.abi);
abiDecoder.addABI(HotelContract.abi);
abiDecoder.addABI(WTIndexContract.abi);
abiDecoder.addABI(UnitTypeContract.abi);
abiDecoder.addABI(UnitContract.abi);

const abis = {
  WTIndex: WTIndexContract.abi,
  Hotel: HotelContract.abi,
  LifToken: LifTokenContract.abi,
  HotelUnit: UnitContract.abi,
  HotelUnitType: UnitTypeContract.abi
};

const binaries = {
  WTIndex: WTIndexContract.bytecode,
  Hotel: HotelContract.bytecode,
  LifToken: LifTokenContract.bytecode,
  HotelUnit: UnitContract.bytecode,
  HotelUnitType: UnitTypeContract.bytecode
}

// --------------------------- Constants / Converters / Type Helpers -------------------------------

const testnetId = 77;
const defaultGas = 4700000;
const zeroBytes8 = '0x0000000000000000';
const zeroAddress = '0x0000000000000000000000000000000000000000';
const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000';


// Returns the date from a single integer in format DD/MM/YYYY
function parseDate(date){
  return moment([1970, 0, 1]).add(date, 'days').toDate();
};

// Returns the date formatted in days since 1970 0 1
function formatDate(date){
  return Math.round(new Date(date).getTime()/86400000);
};


function isZeroBytes8(val){
  return val === zeroBytes8;
}

function isZeroBytes32(val){
  return val === zeroBytes32;
};

function isZeroAddress(val){
  return val === zeroAddress;
};

function isZeroString(val){
  return (val.length) ? false : true;
};

function isZeroUint(val){
  return parseInt(val) === 0;
};

function isInvalidOpcodeEx(e) {
  return e.message.search('invalid opcode') >= 0;
};

function currencyCodeToHex(code, context){
  if (typeof code !== 'number')
    throw new Error();

  const hex = context.web3.utils.toHex(code);
  return context.web3.utils.padLeft(hex, 16);
}

function priceToUint(price){
  return price.toFixed(2) * 100;
}

function bnToPrice(uint){
  uint = (typeof uint === 'Object') ? uint.toNumber() : uint;
  return (uint/100).toFixed(2);
}

function lifWei2Lif(value, context){
  return context.web3.utils.fromWei(value, 'ether');
};

function lif2LifWei(value, context){
  return context.web3.utils.toWei(''+value, 'ether');
};

function locationToUint(longitude, latitude){
  return {
    long : Math.round((90 + longitude) * 10e5),
    lat: Math.round((180 + latitude) * 10e5),
  }
};

function locationFromUint(longitude, latitude){
  latitude = parseInt(latitude);
  longitude = parseInt(longitude);
  return {
    lat: parseFloat((latitude - (180 * 10e5)) / 10e5).toFixed(6),
    long: parseFloat((longitude - (90 * 10e5)) / 10e5).toFixed(6)
  }
};

function bytes32ToString(hex){
  var str = "";
  var i = 0, l = hex.length;
  if (hex.substring(0, 2) === '0x') {
      i = 2;
  }
  for (; i < l; i+=2) {
      var code = parseInt(hex.substr(i, 2), 16);
      if (code === 0)
          break;
      str += String.fromCharCode(code);
  }

  return utf8.decode(str);
};

function splitCamelCaseToString(s) {
  return s.split(/(?=[A-Z])/).map(function(p) {
      return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(' ');
};

//----------------------------------------- Web3 Helpers -------------------------------------------

/**
 * Extracts the guest data from an instant payment Booking initiated by
 * a `token.approveData` transaction.
 * @param  {String} hash    transaction hash, available on the `CallStarted` event
 * @param  {Object} context execution context of the class ()
 * @return {String}      plain text guest data. If this is JSON it will need to be parsed.
 */
async function getGuestData(hash, context){
  let guestData;
  let tx = await context.web3.eth.getTransaction(hash);
  let method = abiDecoder.decodeMethod(tx.input);

  if (method.name === 'approveData'){
    const paramData = method.params.filter(call => call.name === 'data')[0].value;
    method = abiDecoder.decodeMethod(paramData);
  }

  guestData = method.params.filter(call => call.name === 'privateData')[0].value;
  return context.web3.utils.toUtf8(guestData);
}

async function addGasMargin(gas, context){
  const id = await context.web3.eth.net.getId();
  return (id === testnetId)
    ? defaultGas
    : Math.round(gas * context.gasMargin);
}

function getInstance(name, address, context){
  const abi = abis[name];
  const contract = new context.web3.eth.Contract(abi, address);
  contract.setProvider(context.web3.currentProvider);
  return contract;
};

async function fundAccount(from, to, amount, _web3){
  return _web3.eth.sendTransaction({
    from: from,
    to: to,
    value: _web3.utils.toWei(amount, 'ether')
  });
};

/**
 * Traverses a solidity array and returns an array of all its non-zero elements
 * @param {Function} getAtIndex reference to a getter method (e.g. getImage)
 * @param {Number}   length solidity array's length
 * @param {Function} zeroComparator e.g isZeroAddress
 * @return {Promise} Array
 */
async function jsArrayFromSolidityArray(getAtIndex, length, zeroComparator){
  const arr = [];

  for (let i = 0; i < length; i++){
    let item = await getAtIndex(i).call();
    arr.push(item)
  };

  return (zeroComparator !== undefined)
    ? arr.filter(item => !zeroComparator(item))
    : arr;
}

/**
  Returns all transactions between a hotel manager and WTIndex.
  Uses the etherscan API (unless running a local blockchain).
  @param {Address} walletAddress Manager's address
  @param {Address} indexAddress  WTIndex address
  @param {Number}  startBlock    Block number to start searching from
  @param {Object}  web3          Web3 instance
  @param {String}  networkName   Name of the ethereum network ('api' for main, 'test' for local)
*/
async function getDecodedTransactions(walletAddress, indexAddress, startBlock, web3, networkName) {
  let txs = [];
  let rawTxs = [];

  //Get manager's hotel addresses
  let wtIndex = getInstance('WTIndex', indexAddress, {web3: web3});
  let hotelsAddrs = await wtIndex.methods
      .getHotelsByManager(walletAddress)
      .call();
  let hotelInstances = [];

  //Obtain TX data, either from etherscan or from local chain
  if(networkName != 'test') {
    rawTxs = await request.get('http://'+networkName+'.etherscan.io/api')
      .query({
        module: 'account',
        action: 'txlist',
        address: walletAddress,
        startBlock: startBlock,
        endBlock: 'latest',
        apikey: '6I7UFMJTUXG6XWXN8BBP86DWNHC9MI893F'
      });
    rawTxs = rawTxs.body.result;
    indexAddress = indexAddress.toLowerCase();
  } else {
    rawTxs = await getTransactionsByAccount(walletAddress, indexAddress, 0, null, web3);
  }

  //Decode the TXs
  const start = async () => {
    await Promise.all(rawTxs.map(async tx => {
      if(tx.to == indexAddress) {
        let txData = {};
        txData.timeStamp = tx.timeStamp;
        let method = abiDecoder.decodeMethod(tx.input);
        if(method.name == 'callHotel') {
          let hotelIndex = method.params.find(call => call.name === 'index').value;
          txData.hotel = hotelsAddrs[hotelIndex];
          method = abiDecoder.decodeMethod(method.params.find(call => call.name === 'data').value);
          if(method.name == 'callUnitType' || method.name == 'callUnit') {
            method = abiDecoder.decodeMethod(method.params.find(call => call.name === 'data').value);
          }
          if(method.name == 'continueCall') {
            let msgDataHash = method.params.find(call => call.name === 'msgDataHash').value;
            if(!hotelInstances[txData.hotel]) {
              hotelInstances[txData.hotel] = await getInstance('Hotel', txData.hotel, {web3: web3});
            }
            let publicCallData = await hotelInstances[txData.hotel].methods.getPublicCallData(msgDataHash).call();
            method = abiDecoder.decodeMethod(publicCallData);
          }
        }
        if(method.name == 'bookWithLif') {
          method.name = 'confirmLifBooking';
          let receipt = await web3.eth.getTransactionReceipt(tx.hash);
          txData.lifAmount = abiDecoder.decodeLogs(receipt.logs).find(log => log.name == 'Transfer').events.find(e => e.name == 'value').value
        }
        if(method.name == 'book') {
          method.name = 'confirmBooking';
        }
        method.name = splitCamelCaseToString(method.name);
        txData.method = method;
        txs.push(txData);
      }
    }))
  }
  await start();

  return txs;
}

//modified version of https://ethereum.stackexchange.com/questions/2531/common-useful-javascript-snippets-for-geth/3478#3478
//only used for testing getDecodedTransactions locally
async function getTransactionsByAccount(myaccount, wtAddresses, startBlockNumber, endBlockNumber, web3) {
  if (endBlockNumber == null) {
    endBlockNumber = await web3.eth.getBlockNumber();
  }
  if (startBlockNumber == null) {
    startBlockNumber = endBlockNumber - 1000;
  }
  let txs = [];
  for (var i = startBlockNumber; i <= endBlockNumber; i++) {
    var block = await web3.eth.getBlock(i, true);
    if (block != null && block.transactions != null) {
      block.transactions.forEach( function(e) {
        if (myaccount == e.from && wtAddresses.includes(e.to)) {
          e.timeStamp = block.timestamp;
          txs.push(e);
        }
      })
    }
  }
  return txs;
}

// Debugging helper
function pretty(msg, obj) {
  console.log(`<------ ${msg} ------>\n${print(obj, null, ' ')}\n`)
}

module.exports = {

  // Contract assets
  abis: abis,
  abiDecoder: abiDecoder,
  binaries: binaries,

  // Constants & Converters
  parseDate: parseDate,
  formatDate: formatDate,
  zeroAddress: zeroAddress,
  zeroBytes8: zeroBytes8,
  zeroBytes32: zeroBytes32,
  isZeroBytes8: isZeroBytes8,
  isZeroBytes32: isZeroBytes32,
  isZeroAddress: isZeroAddress,
  isZeroString: isZeroString,
  isZeroUint: isZeroUint,
  isInvalidOpcodeEx: isInvalidOpcodeEx,
  lifWei2Lif: lifWei2Lif,
  lif2LifWei: lif2LifWei,
  currencyCodeToHex: currencyCodeToHex,
  priceToUint: priceToUint,
  bnToPrice: bnToPrice,
  bytes32ToString: bytes32ToString,
  locationToUint: locationToUint,
  locationFromUint: locationFromUint,
  currencyCodes: currencyCodes,

  // Web3 helpers
  getGuestData: getGuestData,
  addGasMargin: addGasMargin,
  getInstance: getInstance,
  fundAccount: fundAccount,
  jsArrayFromSolidityArray: jsArrayFromSolidityArray,
  getDecodedTransactions: getDecodedTransactions,

  // Debugging
  pretty: pretty
}
