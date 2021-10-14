let { loadAddress, loadConf } = require('./support/tokenConfig');

function printUsage() {
  console.log(`
usage: npx saddle script token:verify {tokenAddress} {tokenConfig}

note: $ETHERSCAN_API_KEY environment variable must be set to an Etherscan API Key.

example:

npx saddle -n rinkeby script token:cpordelegate:verify 0x19B674715cD20626415C738400FDd0d32D6809B6 ''
  `);
}

(async function() {
  if (args.length < 1) {
    return printUsage();
  }

  let address = loadAddress(args[0], addresses);

  let etherscanApiKey = env['ETHERSCAN_API_KEY'];
  if (!etherscanApiKey) {
    console.error("Missing required $ETHERSCAN_API_KEY env variable.");
    return printUsage();
  }

  console.log(`Verifying CPoRDelegate at ${address}...`);

  let deployArgs = [];

  // TODO: Make sure we match optimizations count, etc
  await saddle.verify(etherscanApiKey, address, 'CPoRDelegate', [], 0);

  console.log(`Contract verified at https://${network}.etherscan.io/address/${address}`);

  return {
    address
  };
})();
