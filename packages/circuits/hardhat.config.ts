import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import "@typechain/hardhat";
import { config as dotenvConfig } from "dotenv";
import { resolve } from 'path';

// setup the environment variables
dotenvConfig({ path: resolve(__dirname, "./.env") });

const config: HardhatUserConfig = {
  solidity: '0.8.4',
  typechain: {
    outDir: "types",
    target: "ethers-v5",
  },
  paths: {
    tests: "./tests",
  },
  mocha: {
    timeout: 100000000
  },
};

export default config;
