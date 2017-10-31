const _ = require('lodash');
const util = require('../../libs/util/index');

/**
 * Generates a random string of len `length`
 * @param  {Number} length
 * @return {String}        random alpha-numeric id
 */
function randomString(length){
  let text = "";
  const char_list = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const range = _.range(0, length);
  for (let index of range){
    text += char_list.charAt(Math.floor(Math.random() * char_list.length));
  }
  return text;
}

/**
 * Send tokens from one address to another
 * @param  {Instance} token
 * @param  {Address}  sender
 * @param  {Address}  recipient
 * @param  {Number}   value     Lif 'ether'
 * @return {Promise}
 */
async function sendTokens(options){
  const amount = util.lif2LifWei(options.value, {web3: options.web3});

  return await options.token.methods
        .transfer(options.receiver, amount)
        .send({from: options.sender});
}

module.exports = {
  randomString: randomString,
  sendTokens: sendTokens,
}

