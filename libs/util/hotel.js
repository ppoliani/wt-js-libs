const {
  abis,
  binaries,
  getInstance,
  isZeroAddress,
  isZeroBytes32,
  isZeroUint,
  isZeroString,
  bytes32ToString,
  locationFromUint,
  jsArrayFromSolidityArray,
  pretty,
} = require('./misc')


/**
 * Takes bundled data for a hotel call and executes it through the WTIndex callHotel method.
 * @param  {Object} context Hotel class context
 * @param  {Number} index   position of hotel in the WTIndex registry
 * @param  {String} data    call data
 * @return {Promievent}
 */
async function execute(data, index, context, gas){

  const estimate = await context.WTIndex.methods
    .callHotel(index, data)
    .estimateGas();

  const options = {
    from: context.owner,
    gas: gas ? gas : estimate
  };

  return context.WTIndex.methods
    .callHotel(index, data)
    .send(options);
}

/**
 * Deploys a Unit contract which will subsequently be added to a Hotel's list of units
 * @param  {String}  unitType     name of this unit's UnitType, ex: `BASIC_ROOM`
 * @param  {Address} hotelAddress address of the Hotel instance that will own this contract
 * @param  {Object}  context      ex: context.web3 / context.spender
 * @return {Promievent}           web3 deployment result
 */
async function deployUnit(unitType, hotelAddress, context){
  const typeHex = context.web3.utils.toHex(unitType);
  const abi = abis['HotelUnit'];
  const instance = new context.web3.eth.Contract(abi);

  const deployOptions = {
    data: binaries['HotelUnit'],
    arguments: [hotelAddress, typeHex]
  };

  return deployContract(instance, deployOptions, context);
}

/**
 * Deploys a UnitType contract which will subsequently be added to a Hotel's list of unit types
 * @param  {String}  unitType     name of UnitType, ex: `BASIC_ROOM`
 * @param  {Address} hotelAddress address of the Hotel instance that will own this contract
 * @param  {Object}  context      ex: context.web3 / context.spender
 * @return {Promievent}           web3 deployment result
 */
async function deployUnitType(unitType, hotelAddress, context){
  const typeHex = context.web3.utils.toHex(unitType);
  const abi = abis['HotelUnitType'];
  const instance = await new context.web3.eth.Contract(abi);

  const deployOptions = {
    data: binaries['HotelUnitType'],
    arguments: [hotelAddress, typeHex]
  };

  return deployContract(instance, deployOptions, context);
}

/**
 * Deploys an arbitary contract
 * @param  {Instance} instance      web3 1.0 contract instance
 * @param  {Object}   deployOptions options passed the web3 deployment method
 * @param  {Object}   context       Hotel class context
 * @return {Promievent}
 */
async function deployContract(instance, deployOptions, context){
  const deployEstimate = await instance
    .deploy(deployOptions)
    .estimateGas();

  const sendOptions = {
    from: context.owner,
    gas: deployEstimate
  };

  return instance
    .deploy(deployOptions)
    .send(sendOptions);
}

/**
 * Async method that gets the index of a unit type the user intends to remove
 * @param  {Instance} hotel    Hotel
 * @param  {String}   unitType ex: 'BASIC_ROOM'
 * @param  {Object}   context  ex: context.web3
 * @return {Number}
 */
async function getUnitTypeIndex(hotel, unitType, context){
  const typeHex = context.web3.utils.toHex(unitType);
  const typeBytes32 = context.web3.utils.padRight(typeHex, 64);
  const typeNames = await hotel.methods.getUnitTypeNames().call();
  return typeNames.indexOf(typeBytes32);
}

/**
 * Async method that gets a hotel instance and its index number in the WTIndex parent contract
 * @param  {Instance} WTIndex
 * @param  {Address}  address  contract address of Hotel instance
 * @param  {Object}   context  {WTIndex: <Instance>, owner: <address>, web3: <web3>}
 * @return {Promise}  { hotel: <instance>, index: <number> }
 */
async function getHotelAndIndex(address, context){
  const methods = context.WTIndex.methods;
  const owner = context.owner;

  const addresses = await methods.getHotelsByManager(owner).call();
  const index = await addresses.indexOf(address);
  const hotel = getInstance('Hotel', address, context);
  return {
    hotel: hotel,
    index: index
  }
}

/**
 * Async method which gets all info associated with hotel, its unit types and units. Zero
 * elements in the solidity arrays are filtered out and data types are converted from
 * their solidity form to JS, i.e. bytes32 --> utf8.
 * @param  {Instance} wtHotel Hotel contract instance
 * @return {Object}   data
 */
async function getHotelInfo(wtHotel, context){

  // UnitTypes & Amenities
  const unitTypes = {};
  let unitTypeNames = await wtHotel.methods.getUnitTypeNames().call();
  unitTypeNames = unitTypeNames.filter(name => !isZeroBytes32(name))

  if (unitTypeNames.length){
    for (let typeName of unitTypeNames){
      const unitType = await wtHotel.methods.getUnitType(typeName).call();
      const instance = getInstance('HotelUnitType', unitType, context);

      const name = context.web3.utils.toUtf8(typeName);
      unitTypes[name] = {};
      unitTypes[name].address = instance.address;

      // UnitType Amenities
      const amenities = await instance.methods.getAmenities().call();
      unitTypes[name].amenities = amenities.filter(item => !isZeroUint(item))
                                           .map(item => parseInt(item));

      const info = await instance.methods.getInfo().call();

      unitTypes[name].info = {
        description: isZeroString(info[0]) ? null : info[0],
        minGuests: isZeroUint(info[1]) ? null : parseInt(info[1]),
        maxGuests: isZeroUint(info[2]) ? null : parseInt(info[2]),
        price: isZeroString(info[3]) ? null : info[3],
      }

      // UnitType Images
      const length = await instance.methods.getImagesLength().call();
      const images = await jsArrayFromSolidityArray(
        instance.methods.images,
        parseInt(length),
        isZeroString
      );
      unitTypes[name].images = images.filter(item => !isZeroString(item));
    };
  }

  // Hotel Images
  const imagesLength = await wtHotel.methods.getImagesLength();
  const images = await jsArrayFromSolidityArray(
    wtHotel.methods.images,
    parseInt(imagesLength),
    isZeroString
  );

  // Hotel Units
  const units = {};
  const unitsLength = await wtHotel.methods.getUnitsLength().call();
  const unitAddresses = await jsArrayFromSolidityArray(
    wtHotel.methods.units,
    parseInt(unitsLength),
    isZeroAddress
  );

  if(unitAddresses.length){
    for (let address of unitAddresses){
      const instance = getInstance('HotelUnit', address, context);
      units[address] = {};
      units[address].active = await instance.methods.active().call();
      const unitType = await instance.methods.unitType().call();
      units[address].unitType = bytes32ToString(unitType);
    }
  }

  // Hotel Info
  const name =        await wtHotel.methods.name().call();
  const description = await wtHotel.methods.description().call();
  const manager =     await wtHotel.methods.manager().call();
  const lineOne =     await wtHotel.methods.lineOne().call();
  const lineTwo =     await wtHotel.methods.lineTwo().call();
  const zip =         await wtHotel.methods.zip().call();
  const country =     await wtHotel.methods.country().call();
  const created =     await wtHotel.methods.created().call();
  const timezone =    await wtHotel.methods.timezone().call();
  const latitude =    await wtHotel.methods.latitude().call();
  const longitude =   await wtHotel.methods.longitude().call();

  return {
    name: isZeroString(name) ? null : name,
    description: isZeroString(description) ? null : description,
    manager: isZeroAddress(manager) ? null : manager,
    lineOne : isZeroString(lineOne) ? null : lineOne,
    lineTwo : isZeroString(lineTwo) ? null : lineTwo,
    zip : isZeroString(zip) ? null : zip,
    country : isZeroString(country) ? null : country,
    created: isZeroUint(created) ? null : parseInt(created),
    timezone : isZeroUint(timezone) ? null : parseInt(timezone),
    latitude : isZeroUint(latitude) ? null : locationFromUint(longitude, latitude).lat,
    longitude : isZeroUint(longitude) ? null : locationFromUint(longitude, latitude).long,
    images: images,
    unitTypeNames: unitTypeNames.map(name => bytes32ToString(name)),
    unitTypes: unitTypes,
    units: units,
    unitAddresses: unitAddresses
  }
}

module.exports = {
  execute: execute,
  deployUnitType: deployUnitType,
  deployUnit: deployUnit,
  getHotelAndIndex: getHotelAndIndex,
  getHotelInfo: getHotelInfo,
  getUnitTypeIndex: getUnitTypeIndex,
}

