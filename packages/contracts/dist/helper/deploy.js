"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploy_shuffle_test = exports.deploy_shuffle_manager = void 0;
const hardhat_1 = require("hardhat");
const types_1 = require("../types");
function deployDecrypt(owner) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new types_1.DecryptVerifier__factory(owner).deploy();
    });
}
function deployShuffleEncrypt(owner) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new types_1.Shuffle_encryptVerifier__factory(owner).deploy();
    });
}
function deployShuffleEncryptCARD30(owner) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new types_1.Shuffle_encryptVerifier30Card__factory(owner).deploy();
    });
}
function deployShuffleEncryptCARD5(owner) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new types_1.Shuffle_encryptVerifier5Card__factory(owner).deploy();
    });
}
function deploy_shuffle_manager(owner) {
    return __awaiter(this, void 0, void 0, function* () {
        const encrypt52 = yield deployShuffleEncrypt(owner);
        const encrypt30 = yield deployShuffleEncryptCARD30(owner);
        const encrypt5 = yield deployShuffleEncryptCARD5(owner);
        const decrypt = yield deployDecrypt(owner);
        const crypto = yield (yield hardhat_1.ethers.getContractFactory("zkShuffleCrypto")).deploy();
        const sm = yield (yield hardhat_1.ethers.getContractFactory("ShuffleManager", {
            libraries: {
                zkShuffleCrypto: crypto.address,
            },
        })).deploy(decrypt.address, encrypt52.address, encrypt30.address, encrypt5.address);
        return types_1.ShuffleManager__factory.connect(sm.address, owner);
    });
}
exports.deploy_shuffle_manager = deploy_shuffle_manager;
function deploy_shuffle_test(owner) {
    return __awaiter(this, void 0, void 0, function* () {
        const encrypt52 = yield deployShuffleEncrypt(owner);
        const encrypt30 = yield deployShuffleEncryptCARD30(owner);
        const encrypt5 = yield deployShuffleEncryptCARD5(owner);
        const decrypt = yield deployDecrypt(owner);
        const crypto = yield (yield hardhat_1.ethers.getContractFactory("zkShuffleCrypto")).deploy();
        const sm = yield (yield hardhat_1.ethers.getContractFactory("Test", {
            libraries: {
                zkShuffleCrypto: crypto.address,
            },
        })).deploy(decrypt.address, encrypt52.address, encrypt30.address, encrypt5.address);
        return types_1.Test__factory.connect(sm.address, owner);
    });
}
exports.deploy_shuffle_test = deploy_shuffle_test;
//# sourceMappingURL=deploy.js.map