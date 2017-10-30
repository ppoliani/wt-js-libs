const misc = require('./misc');
const token = require('./token');
const hotel = require('./hotel');


module.exports = {
  sendTokens: misc.sendTokens,

  simulateCrowdsale: token.simulateCrowdsale,
  runTokenGenerationEvent: token.runTokenGenerationEvent,

  generateCompleteHotel: hotel.generateCompleteHotel
}