const Token = require('./token');
const misc = require('./misc');
const utils = require('../../libs/utils/index');

/**
 * Test fixture that creates a LifToken, a WTIndex whose owner is `accounts[0]`, and funds four
 * wallet accounts with 50 ETH (for gas fees). `wallet["0"]` creates the index and is meant
 * to represent the dao. Additionally, `wallets["1-3"]` are funded with 500 Lif for bookings payments.
 * This method is  meant to be run once in the `before` block of any suite that needs
 * HotelManagers and clients.
 * @param  {Array}  accounts  `web3.eth.accounts`
 * @param  {Object} web3      web3 instance
 * @return {Object}
 * @example
 * const accounts = await web3.eth.getAccounts();
 * const {
 *   index,  // WTIndex instance
 *   token,  // LifToken instance (it's address is registered with the `index`)
 *   wallet, // web3.eth.accounts.wallet w/ 4 accounts. (See above)
 * } = await help.createWindingTreeEconomy(accounts)
 */
async function createWindingTreeEconomy(accounts, web3){
  const defaultGas = 400000;
  const wallet = await web3.eth.accounts.wallet.create(4);
  const fundingSource = accounts[0];

  await utils.fundAccount(fundingSource, wallet["0"].address, 50, web3);
  await utils.fundAccount(fundingSource, wallet["1"].address, 50, web3);
  await utils.fundAccount(fundingSource, wallet["2"].address, 50, web3);
  await utils.fundAccount(fundingSource, wallet["3"].address, 50, web3);

  const index = await utils.deployIndex({
    owner: wallet["0"].address,
    gasMargin: 1.5,
    web3: web3
  });

  const token = await Token.runTokenGenerationEvent();

  const setLifData = await index.methods
    .setLifToken(token.options.address)
    .encodeABI();

  const setLifOptions = {
    from: wallet["0"].address,
    to: index.options.address,
    gas: defaultGas,
    data: setLifData
  };

  await web3.eth.sendTransaction(setLifOptions);

  const tokenFundingOptions = {
    token: token,
    sender: fundingSource,
    value: 500,
    web3: web3
  };

  tokenFundingOptions.receiver = wallet["1"].address;
  await misc.sendTokens(tokenFundingOptions);

  tokenFundingOptions.receiver = wallet["2"].address;
  await misc.sendTokens(tokenFundingOptions);

  tokenFundingOptions.receiver = wallet["3"].address;
  await misc.sendTokens(tokenFundingOptions);

  return {
    index: index,
    token: token,
    wallet: wallet,
  }
}

module.exports = {
  createWindingTreeEconomy: createWindingTreeEconomy
}

