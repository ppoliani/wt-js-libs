const misc = require('./misc');
const token = require('./token');
const hotel = require('./hotel');
const economy = require('./economy');

module.exports = {
  // -- Misc --
  sendTokens: misc.sendTokens,

  // -- Token --
  increaseTimeTestRPC: token.increaseTimeTestRPC,
  increaseTimeTestRPCTo: token.increaseTimeTestRpcTo,
  simulateCrowdsale: token.simulateCrowdsale,
  runTokenGenerationEvent: token.runTokenGenerationEvent,

  // -- Hotel --
  generateCompleteHotel: hotel.generateCompleteHotel,

  // -- Economy --
  createWindingTreeEconomy: economy.createWindingTreeEconomy
}

