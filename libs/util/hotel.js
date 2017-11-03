const {
  abis,
  binaries,
  getInstance,
  isZeroAddress,
  isZeroBytes8,
  isZeroBytes32,
  isZeroUint,
  isZeroString,
  bytes32ToString,
  bnToPrice,
  lifWei2Lif,
  locationFromUint,
  addGasMargin,
  jsArrayFromSolidityArray,
  pretty,
} = require('./misc')


/**
 * Takes bundled data for a hotel call and executes it through the WTIndex callHotel method.
 * @param  {String} data    hex string: output of `instance.method.xyz().encodeABI()`
 * @param  {Number} index   position of hotel in the WTIndex registry
 * @param  {Object} context Hotel class context
 * @return {Promievent}
 */
async function execute(data, index, context){
  const callData = await context.WTIndex.methods
    .callHotel(index, data)
    .encodeABI();

  const options = {
    from: context.owner,
    to: context.WTIndex.options.address,
    data: callData
  };

  const estimate = await context.web3.eth.estimateGas(options);
  options.gas = await addGasMargin(estimate, context);

  return context.web3.eth.sendTransaction(options);
}

/**
 * Deploys an Index contract that functions as a registry and transaction entry
 * point for the contract system's Hotels.
 * system's Hotels
 * @param  {Object}  context  ex: context.web3 / context.owner
 * @return {Instance}         WTIndex instance
 */
async function deployIndex(context){
  const abi = abis['WTIndex'];
  const instance = new context.web3.eth.Contract(abi);

  const deployOptions = {
    data: binaries['WTIndex'],
    arguments: []
  };

  const tx = await deployContract(instance, deployOptions, context);
  return getInstance('WTIndex', tx.contractAddress, context);
}

/**
 * Deploys a Unit contract which will subsequently be added to a Hotel's list of units
 * @param  {String}  unitType     name of this unit's UnitType, ex: `BASIC_ROOM`
 * @param  {Address} hotelAddress address of the Hotel instance that will own this contract
 * @param  {Object}  context      ex: context.web3 / context.owner
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

  const tx = await deployContract(instance, deployOptions, context);
  return getInstance('HotelUnitType', tx.contractAddress, context);
}

/**
 * Deploys a UnitType contract which will subsequently be added to a Hotel's list of unit types
 * @param  {String}  unitType     name of UnitType, ex: `BASIC_ROOM`
 * @param  {Address} hotelAddress address of the Hotel instance that will own this contract
 * @param  {Object}  context      ex: context.web3 / context.owner
 * @return {Instance}             UnitType contract instance
 */
async function deployUnitType(unitType, hotelAddress, context){
  const typeHex = context.web3.utils.toHex(unitType);
  const abi = abis['HotelUnitType'];
  const instance = await new context.web3.eth.Contract(abi);

  const deployOptions = {
    data: binaries['HotelUnitType'],
    arguments: [hotelAddress, typeHex]
  };

  const tx = await deployContract(instance, deployOptions, context);
  return getInstance('HotelUnitType', tx.contractAddress, context);
}

/**
 * Deploys an arbitary contract
 * @param  {Instance} instance      web3 1.0 contract instance
 * @param  {Object}   deployOptions options passed the web3 deployment method
 * @param  {Object}   context       Hotel class context
 * @return {Promievent}
 */
async function deployContract(instance, deployOptions, context){
  const data = await instance
    .deploy(deployOptions)
    .encodeABI();

  const options = {
    from: context.owner,
    data: data
  };

  estimate = await context.web3.eth.estimateGas(options);
  options.gas = await addGasMargin(estimate, context);

  return context.web3.eth.sendTransaction(options);
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
 * @param  {Instance} wtHotel   Hotel contract instance
 * @param  {Object}   context   `{WTIndex: <Instance>, owner: <address>, web3: <web3>}`
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

      const code = await instance.methods.currencyCode().call();
      units[address].currencyCode = isZeroBytes8(code) ? null : context.web3.utils.hexToNumber(code);

      const defaultPrice = await instance.methods.defaultPrice().call();
      units[address].defaultPrice = isZeroUint(defaultPrice) ? null : bnToPrice(defaultPrice);

      let lifWei = await instance.methods.defaultLifPrice().call();
      lifWei = lifWei2Lif(lifWei, context);
      units[address].defaultLifPrice = isZeroUint(lifWei) ? null : parseInt(lifWei);
    }
  }

  // Hotel Info
  const name =             await wtHotel.methods.name().call();
  const description =      await wtHotel.methods.description().call();
  const manager =          await wtHotel.methods.manager().call();
  const lineOne =          await wtHotel.methods.lineOne().call();
  const lineTwo =          await wtHotel.methods.lineTwo().call();
  const zip =              await wtHotel.methods.zip().call();
  const country =          await wtHotel.methods.country().call();
  const created =          await wtHotel.methods.created().call();
  const timezone =         await wtHotel.methods.timezone().call();
  const latitude =         await wtHotel.methods.latitude().call();
  const longitude =        await wtHotel.methods.longitude().call();
  const waitConfirmation = await wtHotel.methods.waitConfirmation().call();

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
    waitConfirmation: waitConfirmation,
    images: images,
    unitTypeNames: unitTypeNames.map(name => bytes32ToString(name)),
    unitTypes: unitTypes,
    units: units,
    unitAddresses: unitAddresses
  }
}

module.exports = {
  execute: execute,
  deployIndex: deployIndex,
  deployUnitType: deployUnitType,
  deployUnit: deployUnit,
  getHotelAndIndex: getHotelAndIndex,
  getHotelInfo: getHotelInfo,
  getUnitTypeIndex: getUnitTypeIndex,
}

