let { loadConf } = require('./support/tokenConfig');

function printUsage() {
  console.log(`
usage: npx saddle script token:cpordelegate:deploy ''

note: pass VERIFY=true and ETHERSCAN_API_KEY=<api key> to verify contract on Etherscan

example:

npx saddle -n mainnet script token:cpordelegate:deploy ''
  `);
}

function sleep(timeout) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

(async function() {
  if (args.length !== 1) {
    console.log('arglength not 1')
    return printUsage();
  }

  console.log(`Deploying CPoRDelegate...`);

  let contract = await saddle.deploy('CPoRDelegate', []);

  console.log(`Deployed contract to ${contract._address}`);

  if (env['VERIFY']) {
    const etherscanApiKey = env['ETHERSCAN_API_KEY'];
    if (etherscanApiKey === undefined || etherscanApiKey.length === 0) {
      throw new Error(`ETHERSCAN_API_KEY must be set if using VERIFY flag...`);
    }

    console.log(`Sleeping for 30 seconds then verifying contract on Etherscan...`);
    await sleep(30000); // Give Etherscan time to learn about contract
    console.log(`Now verifying contract on Etherscan...`);

    await saddle.verify(etherscanApiKey, contract._address, 'CPoRDelegate', [], 0);
    console.log(`Contract verified at https://${network}.etherscan.io/address/${contract._address}`);
  }

  return {
    address: contract._address
  };
})();
