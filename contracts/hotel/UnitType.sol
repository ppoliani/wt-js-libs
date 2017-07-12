pragma solidity ^0.4.11;

import "../PrivateCall.sol";

/*
 * UnitType
 * A type of unit that a Hotel has in his inventory, with all the units
 * information and avaliability.
 */
contract UnitType is PrivateCall {

	bool public active;
	bytes32 public unitType;
	uint public totalUnits;
<<<<<<< 47d1fd370838149601d09706710d8ef54fa1e9a4:contracts/hotel/UnitType.sol
  string description;
  uint minGuests;
  uint maxGuests;
  string price;
  uint[] amenities;
  mapping(uint => uint) amenitiesIndex;
  string[] images;
=======
>>>>>>> Update wt-contracts submodule and build:contracts/WTHotelUnitType.sol

	// The units that the hotels has of this type.
	mapping(uint => Unit) public units;

	struct Unit {
		bool active;
<<<<<<< 47d1fd370838149601d09706710d8ef54fa1e9a4:contracts/hotel/UnitType.sol
=======
		uint[] amenities;
    mapping(uint => uint) amenitiesIndex;
>>>>>>> Update wt-contracts submodule and build:contracts/WTHotelUnitType.sol
		// An array of all days avaliability after 01-01-1970
		mapping(uint => UnitDay) reservations;
  }

	struct UnitDay {
		string specialPrice;
		address bookedBy;
	}

	event Book(address from, uint unitIndex, uint fromDay, uint daysAmount);

  // Constructor

<<<<<<< 47d1fd370838149601d09706710d8ef54fa1e9a4:contracts/hotel/UnitType.sol
	function UnitType(address _owner, bytes32 _unitType){
=======
	function WTHotelUnitType(address _owner, bytes32 _unitType){
>>>>>>> Update wt-contracts submodule and build:contracts/WTHotelUnitType.sol
		owner = _owner;
		unitType = _unitType;
    active = true;
	}

	// Owner methods

	function addUnit() onlyOwner() {
    totalUnits ++;
		units[totalUnits] = Unit(true);
	}

	function edit(
    string _description,
    uint _minGuests,
    uint _maxGuests,
    string _price
  ) onlyOwner() {
		description = _description;
		minGuests = _minGuests;
		maxGuests = _maxGuests;
    price = _price;
	}

	function active(bool _active) onlyOwner() {
		active = _active;
	}

	function unitActive(uint unitIndex, bool _active) onlyOwner() {
		if ((unitIndex > totalUnits) || (unitIndex == 0))
			throw;
		units[unitIndex].active = _active;
	}

	function setPrice(
    uint unitIndex,
    string price,
    uint fromDay,
    uint daysAmount
  ) onlyOwner() {
		if ((unitIndex > totalUnits) || (unitIndex == 0))
			throw;
		uint toDay = fromDay+daysAmount;
		for (uint i = fromDay; i < toDay; i++)
			units[unitIndex].reservations[i].specialPrice = price;
	}

<<<<<<< 47d1fd370838149601d09706710d8ef54fa1e9a4:contracts/hotel/UnitType.sol
  function addImage(string url) onlyOwner() {
		images.push(url);
	}

  function removeImage(uint imageIndex) onlyOwner() {
		delete images[imageIndex];
	}

	function addAmenity(uint amenity) onlyOwner() {
    amenitiesIndex[amenity] = amenities.length;
		amenities.push(amenity);
	}

	function removeAmenity(uint amenity) onlyOwner() {
		delete amenities[ amenitiesIndex[amenity] ];
    amenitiesIndex[amenity] = 0;
=======
	function addAmenity(uint unitIndex, uint amenity) onlyOwner() {
		if ((unitIndex > totalUnits) || (unitIndex == 0))
			throw;
    units[unitIndex].amenitiesIndex[amenity] = units[unitIndex].amenities.length;
		units[unitIndex].amenities.push(amenity);
	}

	function removeAmenity(uint unitIndex, uint amenity) onlyOwner() {
		if ((unitIndex > totalUnits) || (unitIndex == 0))
			throw;
		delete units[unitIndex].amenities[ units[unitIndex].amenitiesIndex[amenity] ];
    units[unitIndex].amenitiesIndex[amenity] = 0;
>>>>>>> Update wt-contracts submodule and build:contracts/WTHotelUnitType.sol
	}

	function removeUnit(uint unitIndex) onlyOwner() {
		if ((unitIndex > totalUnits) || (unitIndex == 0))
			throw;
		delete units[unitIndex];
    totalUnits --;
	}

	// Methods from private call

	function book(
    uint unitIndex,
    address from,
    uint fromDay,
    uint daysAmount,
    bytes finalDataCall
  ) fromSelf() {
		if (!units[unitIndex].active)
			throw;
		bool canBook = true;
		uint toDay = fromDay+daysAmount;

		for (uint i = fromDay; i <= toDay ; i++){
			if (units[unitIndex].reservations[i].bookedBy != address(0)) {
				canBook = false;
				break;
			}
		}

		if (canBook){
			for (i = fromDay; i <= toDay ; i++)
				units[unitIndex].reservations[i].bookedBy = from;
			Book(from, unitIndex, fromDay, toDay);
      owner.call(finalDataCall);
		}
	}

	// Public methods

<<<<<<< 47d1fd370838149601d09706710d8ef54fa1e9a4:contracts/hotel/UnitType.sol
  function getInfo() constant returns(string, uint, uint, string, bool) {
		return (description, minGuests, maxGuests, price, active);
	}

  function getUnit(uint unitIndex) constant returns(bool) {
		return (units[unitIndex].active);
	}

  function getAmenities() constant returns(uint[]) {
		return (amenities);
=======
  function getUnit( uint unitIndex ) constant returns(
    string, string, uint, uint, string, bool
  ) {
		return (
      units[unitIndex].name,
  		units[unitIndex].description,
  		units[unitIndex].minGuests,
  		units[unitIndex].maxGuests,
  		units[unitIndex].price,
  		units[unitIndex].active
    );
	}

  function getAmenities(uint unitIndex) constant returns(uint[]) {
		return (units[unitIndex].amenities);
>>>>>>> Update wt-contracts submodule and build:contracts/WTHotelUnitType.sol
	}

	function getReservation(
    uint unitIndex,
    uint day
  ) constant returns(string, address) {
		return (
      units[unitIndex].reservations[day].specialPrice,
      units[unitIndex].reservations[day].bookedBy
    );
	}

<<<<<<< 47d1fd370838149601d09706710d8ef54fa1e9a4:contracts/hotel/UnitType.sol
  function getImage(uint i) constant returns (string) {
		return images[i];
	}

  function getImagesLength() constant returns (uint) {
		return images.length;
	}

=======
>>>>>>> Update wt-contracts submodule and build:contracts/WTHotelUnitType.sol
}
