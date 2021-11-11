import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import * as path from "path";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";
import { glob } from "hardhat/internal/util/glob";
import { HardhatUserConfig, subtask } from "hardhat/config";
import "hardhat-storage-layout";

const MAINNET_URL = process.env.MAINNET_URL!;
const MAINNET_PK = process.env.MAINNET_PK!;

subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS, async (_, { config }) => {
  // Override hardhat `sources` so we can compile from multiple dirs
  const mainContracts = await glob(
    path.join(config.paths.root, "contracts/**/*.sol")
  );
  const testContracts = await glob(
    path.join(config.paths.root, "tests/Contracts/**/*.sol")
  );

  return [...mainContracts, ...testContracts].map(path.normalize);
});

const hardhatConfig: HardhatUserConfig = {
  networks: {
    hardhat: {
      forking: {
        url: MAINNET_URL,
        blockNumber: 13366176,
      },
      accounts: [
        {
          privateKey: MAINNET_PK,
          balance: "87000000000000000000",
        },
      ],
    },
    mainnet: {
      url: MAINNET_URL,
      accounts: [MAINNET_PK],
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 0,
          },
          outputSelection: {
            "*": {
              "*": ["storageLayout"],
            },
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 0,
          },
        },
      },
    ],
  },
  typechain: {
    outDir: "types",
    target: "ethers-v5",
  },
};
module.exports = hardhatConfig;
