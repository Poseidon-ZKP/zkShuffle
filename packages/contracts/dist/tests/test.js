"use strict";
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
    before(async () => {
        signers = await hardhat_1.ethers.getSigners();
        sm_owner = signers[10];
        game_owner = signers[11];
        await Promise.all([
            "wasm/decrypt.wasm",
            "zkey/decrypt.zkey",
            "wasm/encrypt.wasm.5",
            "zkey/encrypt.zkey.5",
            "wasm/encrypt.wasm",
            "zkey/encrypt.zkey",
        ].map(async (e) => {
            await (0, utility_1.dnld_aws)(e);
        }));
    });
    it("Player Register StateLess", async () => {
        const SM = await (0, deploy_1.deploy_shuffle_test)(sm_owner);
        const gameId = 1;
        const numCards = 5;
        const numPlayers = 2;
        let players = [];
        for (let i = 0; i < 9; i++) {
            players.push(await zkShuffle_1.ZKShuffle.create(SM.address, signers[i], await zkShuffle_1.ZKShuffle.generateShuffleSecret(), (0, path_1.resolve)(utility_1.P0X_DIR, "./wasm/decrypt.wasm"), (0, path_1.resolve)(utility_1.P0X_DIR, "./zkey/decrypt.zkey"), (0, path_1.resolve)(utility_1.P0X_DIR, "./wasm/encrypt.wasm.5"), (0, path_1.resolve)(utility_1.P0X_DIR, "./zkey/encrypt.zkey.5")));
        }
        await SM.set_gameInfo(gameId, numCards, numPlayers);
        await SM.set_gameState(gameId, zkShuffle_1.BaseState.Registration);
        (0, chai_1.expect)((await SM.gameState(gameId)).toNumber()).equal(zkShuffle_1.BaseState.Registration);
        async function playerRegister(pid) {
            const player = players[pid];
            return await types_1.ShuffleManager__factory.connect(SM.address, player.signer).playerRegister(gameId, await player.signer.getAddress(), player.pk[0], player.pk[1]);
        }
        await (0, chai_1.expect)(playerRegister(0))
            .to.emit(SM, "Register")
            .withArgs(gameId, 0, await players[0].signer.getAddress());
        await (0, chai_1.expect)(playerRegister(1))
            .to.emit(SM, "Register")
            .withArgs(gameId, 1, await players[1].signer.getAddress());
        await (0, chai_1.expect)(playerRegister(2)).to.be.revertedWith("Game full");
    });
});
//# sourceMappingURL=test.js.map