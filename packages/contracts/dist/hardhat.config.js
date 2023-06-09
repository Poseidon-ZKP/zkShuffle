"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@nomiclabs/hardhat-ethers");
require("@typechain/hardhat");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
require("hardhat-contract-sizer");
require("solidity-docgen");
require("solidity-coverage");
require("@nomiclabs/hardhat-solpp");
require("@nomicfoundation/hardhat-chai-matchers");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, "./.env") });
let testConfig = {
    SHUFFLE_UNIT_TEST: true,
};
let contractDefs = {
    test: testConfig,
    localhost: testConfig,
};
const config = {
    solidity: {
        compilers: [
            {
                version: "0.8.4",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    typechain: {
        target: "ethers-v5",
        outDir: "types",
    },
    paths: {
        sources: "./contracts",
        tests: "./tests",
        artifacts: "./artifacts/contract-artifacts",
        cache: "./artifacts/cache",
    },
    solpp: {
        defs: ((hre) => {
            return testConfig;
        })(),
    },
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
        },
    },
    mocha: {
        timeout: 100000000,
    },
};
exports.default = {
    ...config,
    docgen: {
        pages: (contracts) => `${contracts.name}.md`,
    },
};
//# sourceMappingURL=hardhat.config.js.map