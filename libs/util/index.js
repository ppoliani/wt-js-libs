const hotel = require('./hotel.js');
const misc = require('./misc.js');

module.exports = {

  // Hotel
  execute: hotel.execute,
  deployIndex: hotel.deployIndex,
  deployUnitType: hotel.deployUnitType,
  deployUnit: hotel.deployUnit,
  getHotelInfo: hotel.getHotelInfo,
  getHotelAndIndex: hotel.getHotelAndIndex,
  getUnitTypeIndex: hotel.getUnitTypeIndex,


  // Misc
  abiDecoder: misc.abiDecoder,
  parseDate: misc.parseDate,
  formatDate: misc.formatDate,
  isZeroBytes32: misc.isZeroBytes32,
  isZeroAddress: misc.isZeroAddress,
  isZeroString: misc.isZeroString,
  isZeroUint: misc.isZeroUint,
  isInvalidOpcodeEx: misc.isInvalidOpcodeEx,
  lifWei2Lif: misc.lifWei2Lif,
  lif2LifWei: misc.lif2LifWei,
  bytes32ToString: misc.bytes32ToString,
  locationToUint: misc.locationToUint,
  locationFromUint: misc.locationFromUint,
  addGasMargin: misc.addGasMargin,
  getInstance: misc.getInstance,
  fundAccount: misc.fundAccount,
  jsArrayFromSolidityArray: misc.jsArrayFromSolidityArray,
  pretty: misc.pretty
}
