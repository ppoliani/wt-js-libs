const utf8 = require('utf8');

const WTKeyIndexContract = require('../../build/contracts/WTKeyIndex.json');
const WTIndexContract = require('../../build/contracts/WTIndex.json');
const HotelContract = require('../../build/contracts/Hotel.json');
const UnitTypeContract = require('../../build/contracts/UnitType.json');
const UnitContract = require('../../build/contracts/Unit.json');
const PrivateCallContract = require('../../build/contracts/PrivateCall.json');
const LifTokenContract = require('../../build/contracts/LifToken.json');

const abiDecoder = require('abi-decoder');
const moment = require('moment');
const print = JSON.stringify;

// ABI Decoder
abiDecoder.addABI(PrivateCallContract.abi);
abiDecoder.addABI(LifTokenContract.abi);
abiDecoder.addABI(HotelContract.abi);
abiDecoder.addABI(WTIndexContract.abi);
abiDecoder.addABI(WTKeyIndexContract.abi);
abiDecoder.addABI(UnitTypeContract.abi);
abiDecoder.addABI(UnitContract.abi);

const abis = {
  WTIndex: WTIndexContract.abi,
  WTKeyIndex: WTKeyIndexContract.abi,
  Hotel: HotelContract.abi,
  LifToken: LifTokenContract.abi,
  HotelUnit: UnitContract.abi,
  HotelUnitType: UnitTypeContract.abi
};

const binaries = {
  WTIndex: WTIndexContract.unlinked_binary,
  WTKeyIndex: WTKeyIndexContract.unlinked_binary,
  Hotel: HotelContract.unlinked_binary,
  LifToken: LifTokenContract.unlinked_binary,
  HotelUnit: UnitContract.unlinked_binary,
  HotelUnitType: UnitTypeContract.unlinked_binary
}

const zeroAddress = '0x0000000000000000000000000000000000000000';
const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

// Returns the date from a single integer in format DD/MM/YYYY
function parseDate(date){
  return moment([1970, 0, 1]).add(date, 'days').format('L');
};

  // Returns the date formated in a single integer
function formatDate(date){
  moment(date).diff(moment([1970, 0, 1]), 'days');
};

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

function lifWei2Lif(value){
  return web3.fromWei(value, 'ether');
};

function lif2LifWei(value){
  return web3.toWei(value, 'ether');
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

function getInstance(name, address, context){
  const web3 = context.web3;
  const abi = abis[name];
  const contract = new web3.eth.Contract(abi, address);
  return contract;
};

async function fundAccount(from, to, amount, web3){
  return web3.eth.sendTransaction({
    from: from,
    to: to,
    value: web3.utils.toWei(amount, 'ether')
  });
};

async function createIndexContract(from, web3){
  const abi = abis['WTIndex'];
  const index = new web3.eth.Contract(abi);

  const deployOptions = {
    data: binaries['WTIndex'],
    arguments: []
  };

  const deployEstimate = await index
    .deploy(deployOptions)
    .estimateGas();

  const sendOptions = {
    from: from,
    gas: deployEstimate
  };

  return index
    .deploy(deployOptions)
    .send(sendOptions);
}
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
  abis: abis,
  abiDecoder: abiDecoder,
  binaries: binaries,
  parseDate: parseDate,
  formatDate: formatDate,

  zeroAddress: zeroAddress,
  zeroBytes32: zeroBytes32,
  isZeroBytes32: isZeroBytes32,
  isZeroAddress: isZeroAddress,
  isZeroString: isZeroString,
  isZeroUint: isZeroUint,
  isInvalidOpcodeEx: isInvalidOpcodeEx,

  lifWei2Lif: lifWei2Lif,
  lif2LifWei: lif2LifWei,
  bytes32ToString: bytes32ToString,

  locationToUint: locationToUint,
  locationFromUint: locationFromUint,

  createIndexContract: createIndexContract,
  getInstance: getInstance,
  fundAccount: fundAccount,

  jsArrayFromSolidityArray: jsArrayFromSolidityArray,
  pretty: pretty
}










