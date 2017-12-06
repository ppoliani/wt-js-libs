const utils = require('./../../libs/utils/index');
const LifCrowdsale = require('../../build/contracts/LifCrowdsale.json');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);

const abi = LifCrowdsale.abi;
const binary = LifCrowdsale.bytecode;

/**
 * Simulates a crowdsale, populates eth.accounts 0 - 4 with token balances
 * and returns a usable LifToken instance.
 * @return {Instance} LifToken
 */
async function runTokenGenerationEvent(){
  const rate = web3.utils.toBN(100000000000);
  const accounts = await web3.eth.getAccounts();
  const crowdsale = await simulateCrowdsale(rate, [40,30,20,10,0], accounts, 1);
  const tokenAddress = await crowdsale.methods.token().call();
  return utils.getInstance('LifToken', tokenAddress, {web3: web3});
}


/**
 * Generates a crowdsale which funds the first five accounts of param `accounts` with
 * Lif tokens. From the LifToken repo - more usage examples at test/LifToken.js there.
 * @param  {Number} rate
 * @param  {Array}  balances
 * @param  {Array}  accounts
 * @param  {Number} weiPerUSD
 * @return {Instance} Crowdsale contract
 * @example
 *  const rate = 100000000000;
  const crowdsale = await help.simulateCrowdsale(rate, [40,30,20,10,0], accounts, 1, web3);
  const tokenAddress = await crowdsale.methods.token().call();
  const token = utils.getInstance('LifToken', tokenAddress, web3);
  const balance = await token.methods.balanceOf(account[0]).call();
 */
async function simulateCrowdsale(rate, balances, accounts, weiPerUSD) {
  // Set deployment time conditions
  await increaseTimeTestRPC(1);
  const startTime = await latestTime() + 5;
  const endTime = startTime + 20;

  // Deploy crowdsale contract
  const crowdsaleArgs = [
    startTime+3,
    startTime+15,
    endTime,
    rate,
    rate+10,
    1,
    accounts[0],
    accounts[1],
  ];

  const contract = await new web3.eth.Contract(abi);

  const constructorOptions = {
    data: binary,
    arguments: crowdsaleArgs,
  }

  const deployData = await contract
    .deploy(constructorOptions)
    .encodeABI();

  const deployOptions = {
    from: accounts[0],
    gas: 6000000,
    data: deployData
  };

  const tx = await web3.eth.sendTransaction(deployOptions);
  const crowdsale = new web3.eth.Contract(abi, tx.contractAddress);

  // Setup
  let latest = await latestTime();
  await increaseTimeTestRPCTo(latest + 1);

  await crowdsale.methods
    .setWeiPerUSDinTGE(weiPerUSD)
    .send({from: accounts[0], gas: 6000000});

  await increaseTimeTestRPCTo(startTime+3);

  // Run
  for(let i = 0; i < 5; i++) {
    if (balances[i] > 0){
      const options = {
        to: crowdsale.options.address,
        value: web3.utils.toWei(web3.utils.toBN(i+1), 'ether'),
        from: accounts[i + 1],
        gas: 600000
      };
      const tx = await web3.eth.sendTransaction(options);
    }
  }
  await increaseTimeTestRPCTo(endTime+1);

  // Finalize
  await crowdsale.methods
    .finalize()
    .send({from: accounts[0], gas: 6000000});

  return crowdsale;
}

/**
 * Async gets most recent block timestamp
 * @param  {Object} web3
 * @return {String} timestamp
 */
async function latestTime(){
  const block = await web3.eth.getBlock('latest');
  return block.timestamp;
};

/**
 * Async increases the rpc timestamp `duration` amount
 * @param  {Number} duration
 * @return {Promise}
 */
function increaseTimeTestRPC(duration) {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id: id,
    }, err1 => {
      if (err1) return reject(err1);
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id+1,
      }, (err2, res) => {
        return err2 ? reject(err2) : resolve(res);
      });
    });
  });
}

/**
 * Async attempts to set the rpc timestamp to `target`
 * @param  {Number} target timestamp
 * @return {Promise}
 */
async function increaseTimeTestRPCTo(target) {
  let now = await latestTime();
  if (target < now) throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
  let diff = target - now;
  return increaseTimeTestRPC(diff);
}

module.exports = {
  increaseTimeTestRPC: increaseTimeTestRPC,
  increaseTimeTestRPCTo: increaseTimeTestRPCTo,
  runTokenGenerationEvent: runTokenGenerationEvent,
  simulateCrowdsale: simulateCrowdsale
}
