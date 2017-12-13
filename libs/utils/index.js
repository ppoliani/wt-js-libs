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
  abis: misc.abis,
  abiDecoder: misc.abiDecoder,
  parseDate: misc.parseDate,
  formatDate: misc.formatDate,
  isZeroBytes8: misc.isZeroBytes8,
  isZeroBytes32: misc.isZeroBytes32,
  isZeroAddress: misc.isZeroAddress,
  isZeroString: misc.isZeroString,
  isZeroUint: misc.isZeroUint,
  isInvalidOpcodeEx: misc.isInvalidOpcodeEx,
  lifWei2Lif: misc.lifWei2Lif,
  lif2LifWei: misc.lif2LifWei,
  currencyCodeToHex: misc.currencyCodeToHex,
  bytes32ToString: misc.bytes32ToString,
  priceToUint: misc.priceToUint,
  bnToPrice: misc.bnToPrice,
  locationToUint: misc.locationToUint,
  locationFromUint: misc.locationFromUint,
  getLifGuestData: misc.getLifGuestData,
  getGuestData: misc.getGuestData,
  addGasMargin: misc.addGasMargin,
  getInstance: misc.getInstance,
  fundAccount: misc.fundAccount,
  jsArrayFromSolidityArray: misc.jsArrayFromSolidityArray,
  pretty: misc.pretty,
  currencyCodes: misc.currencyCodes
}
