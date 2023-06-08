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
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const zkShuffle_1 = require("@poseidon-zkp/poseidon-zk-jssdk/src/shuffle/zkShuffle");
const deploy_1 = require("../helper/deploy");
const types_1 = require("../types");
const path_1 = require("path");
const utility_1 = require("@poseidon-zkp/poseidon-zk-jssdk/src/shuffle/utility");
describe("ZKShuffle State Less Unit Test", function () {
    let sm_owner;
    let game_owner;
    let signers;
    before(() => __awaiter(this, void 0, void 0, function* () {
        signers = yield hardhat_1.ethers.getSigners();
        sm_owner = signers[10];
        game_owner = signers[11];
        yield Promise.all([
            "wasm/decrypt.wasm",
            "zkey/decrypt.zkey",
            "wasm/encrypt.wasm.5",
            "zkey/encrypt.zkey.5",
            "wasm/encrypt.wasm",
            "zkey/encrypt.zkey",
        ].map((e) => __awaiter(this, void 0, void 0, function* () {
            yield (0, utility_1.dnld_aws)(e);
        })));
    }));
    it("Player Register StateLess", () => __awaiter(this, void 0, void 0, function* () {
        const SM = yield (0, deploy_1.deploy_shuffle_test)(sm_owner);
        const gameId = 1;
        const numCards = 5;
        const numPlayers = 2;
        let players = [];
        for (let i = 0; i < 9; i++) {
            players.push(yield zkShuffle_1.ZKShuffle.create(SM.address, signers[i], yield zkShuffle_1.ZKShuffle.generateShuffleSecret(), (0, path_1.resolve)(utility_1.P0X_DIR, "./wasm/decrypt.wasm"), (0, path_1.resolve)(utility_1.P0X_DIR, "./zkey/decrypt.zkey"), (0, path_1.resolve)(utility_1.P0X_DIR, "./wasm/encrypt.wasm.5"), (0, path_1.resolve)(utility_1.P0X_DIR, "./zkey/encrypt.zkey.5")));
        }
        yield SM.set_gameInfo(gameId, numCards, numPlayers);
        yield SM.set_gameState(gameId, zkShuffle_1.BaseState.Registration);
        (0, chai_1.expect)((yield SM.gameState(gameId)).toNumber()).equal(zkShuffle_1.BaseState.Registration);
        function playerRegister(pid) {
            return __awaiter(this, void 0, void 0, function* () {
                const player = players[pid];
                return yield types_1.ShuffleManager__factory.connect(SM.address, player.signer).playerRegister(gameId, yield player.signer.getAddress(), player.pk[0], player.pk[1]);
            });
        }
        yield (0, chai_1.expect)(playerRegister(0))
            .to.emit(SM, "Register")
            .withArgs(gameId, 0, yield players[0].signer.getAddress());
        yield (0, chai_1.expect)(playerRegister(1))
            .to.emit(SM, "Register")
            .withArgs(gameId, 1, yield players[1].signer.getAddress());
        yield (0, chai_1.expect)(playerRegister(2)).to.be.revertedWith("Game full");
    }));
});
//# sourceMappingURL=test.js.map