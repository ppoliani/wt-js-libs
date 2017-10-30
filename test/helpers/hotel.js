const _ = require('lodash');
const util = require('./misc.js');
const HotelManager = require('./../../libs/HotelManager');

/**
 * Generates a randomly named hotel with a single 'BASIC_ROOM' UnitType and a single Unit
 * @param  {Address} indexAddress WTIndex contract address to register this hotel with
 * @param  {Address} ownerAccount Owner account
 * @param  {Number}  gasMargin    Floating point number to multiply gas estimates by
 * @param  {Object}  web3         Instantiated web3 provider
 * @return {Object}
 * @example
 *   const {
 *     Manager,       // HotelManager class instance
 *     hotelAddress,  // Address of deployed hotel
 *     unitAddress    // Address of deployed unit
 *   } = await generateCompleteHotel(indexAddress, ownerAccount, 1.5, web3);
 */
async function generateCompleteHotel(
  indexAddress,
  ownerAccount,
  gasMargin,
  web3
){
  const hotelName = util.randomString(10);
  const hotelDescription = util.randomString(15);
  const typeName = 'BASIC_ROOM';

  const lib = new HotelManager({
    indexAddress: indexAddress,
    owner: ownerAccount,
    gasMargin: gasMargin,
    web3: web3
  })

  await lib.createHotel(hotelName, hotelDescription);
  const hotels = await lib.getHotels();
  const hotelsArray = Object.keys(hotels);
  const latest = hotelsArray.length - 1;
  hotelAddress = hotelsArray[latest];

  await lib.addUnitType(hotelAddress, typeName);
  await lib.addUnit(hotelAddress, typeName);
  hotel = await lib.getHotel(hotelAddress);
  unitAddress = hotel.unitAddresses[0];

  return {
    Manager: lib,
    hotelAddress: hotelAddress,
    unitAddress: unitAddress
  }
}

module.exports = {
  generateCompleteHotel: generateCompleteHotel
}

