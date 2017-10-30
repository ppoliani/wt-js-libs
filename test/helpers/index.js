const misc = require('./misc');
const token = require('./token');
const hotel = require('./hotel');


module.exports = {
  sendTokens: misc.sendTokens,

  increaseTimeTestRPC: token.increaseTimeTestRPC,
  increaseTimeTestRPCTo: token.increaseTimeTestRpcTo,
  simulateCrowdsale: token.simulateCrowdsale,
  runTokenGenerationEvent: token.runTokenGenerationEvent,

  generateCompleteHotel: hotel.generateCompleteHotel
}