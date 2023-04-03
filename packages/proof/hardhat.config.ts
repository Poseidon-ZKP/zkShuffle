import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// setup the environment variables
dotenvConfig({ path: resolve(__dirname, "./.env") });

const config: HardhatUserConfig = {
  paths: {
    tests: "./tests",
    cache: "./artifacts/cache",
  },
  mocha: {
    timeout: 100000000
  },
};

export default config;
