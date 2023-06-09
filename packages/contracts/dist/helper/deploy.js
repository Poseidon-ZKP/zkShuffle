"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploy_shuffle_test = exports.deploy_shuffle_manager = void 0;
const hardhat_1 = require("hardhat");
const types_1 = require("../types");
async function deployDecrypt(owner) {
    return await new types_1.DecryptVerifier__factory(owner).deploy();
}
async function deployShuffleEncrypt(owner) {
    return await new types_1.Shuffle_encryptVerifier__factory(owner).deploy();
}
async function deployShuffleEncryptCARD30(owner) {
    return await new types_1.Shuffle_encryptVerifier30Card__factory(owner).deploy();
}
async function deployShuffleEncryptCARD5(owner) {
    return await new types_1.Shuffle_encryptVerifier5Card__factory(owner).deploy();
}
async function deploy_shuffle_manager(owner) {
    const encrypt52 = await deployShuffleEncrypt(owner);
    const encrypt30 = await deployShuffleEncryptCARD30(owner);
    const encrypt5 = await deployShuffleEncryptCARD5(owner);
    const decrypt = await deployDecrypt(owner);
    const crypto = await (await hardhat_1.ethers.getContractFactory("zkShuffleCrypto")).deploy();
    const sm = await (await hardhat_1.ethers.getContractFactory("ShuffleManager", {
        libraries: {
            zkShuffleCrypto: crypto.address,
        },
    })).deploy(decrypt.address, encrypt52.address, encrypt30.address, encrypt5.address);
    return types_1.ShuffleManager__factory.connect(sm.address, owner);
}
exports.deploy_shuffle_manager = deploy_shuffle_manager;
async function deploy_shuffle_test(owner) {
    const encrypt52 = await deployShuffleEncrypt(owner);
    const encrypt30 = await deployShuffleEncryptCARD30(owner);
    const encrypt5 = await deployShuffleEncryptCARD5(owner);
    const decrypt = await deployDecrypt(owner);
    const crypto = await (await hardhat_1.ethers.getContractFactory("zkShuffleCrypto")).deploy();
    const sm = await (await hardhat_1.ethers.getContractFactory("Test", {
        libraries: {
            zkShuffleCrypto: crypto.address,
        },
    })).deploy(decrypt.address, encrypt52.address, encrypt30.address, encrypt5.address);
    return types_1.Test__factory.connect(sm.address, owner);
}
exports.deploy_shuffle_test = deploy_shuffle_test;
//# sourceMappingURL=deploy.js.map