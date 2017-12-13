const utf8 = require('utf8');

const WTIndexContract = require('../../build/contracts/WTIndex.json');
const HotelContract = require('../../build/contracts/Hotel.json');
const UnitTypeContract = require('../../build/contracts/UnitType.json');
const UnitContract = require('../../build/contracts/Unit.json');
const AsyncCallContract = require('../../build/contracts/AsyncCall.json');
const LifTokenContract = require('../../build/contracts/LifToken.json');

const abiDecoder = require('abi-decoder');
const moment = require('moment');
const currencyCodes = require('currency-codes');
const countryCodes = require('country-code-lookup');
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

function countryCodeToHex(code, context){
  if (typeof code !== 'string' || code.length > 2)
    throw new Error();

  return context.web3.utils.toHex(code);
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
  countryCodeToHex: countryCodeToHex,
  priceToUint: priceToUint,
  bnToPrice: bnToPrice,
  bytes32ToString: bytes32ToString,
  locationToUint: locationToUint,
  locationFromUint: locationFromUint,
  currencyCodes: currencyCodes,
  countryCodes: countryCodes,

  // Web3 helpers
  getGuestData: getGuestData,
  addGasMargin: addGasMargin,
  getInstance: getInstance,
  fundAccount: fundAccount,
  jsArrayFromSolidityArray: jsArrayFromSolidityArray,

  // Debugging
  pretty: pretty
}
