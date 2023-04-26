import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

// setup the environment variables
dotenvConfig({ path: resolve(__dirname, "./.env") });

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.16",
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
  },
  mocha: {
    timeout: 100000000,
  },
  networks: {
    env: {
      url: process.env.URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined
          ? process.env.PRIVATE_KEY.split(",")
          : [],
    },
  },
};

export default config;
