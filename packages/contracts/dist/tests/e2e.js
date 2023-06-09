"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const process_1 = require("process");
const zkShuffle_1 = require("@poseidon-zkp/poseidon-zk-jssdk/src/shuffle/zkShuffle");
const types_1 = require("../types");
const deploy_1 = require("../helper/deploy");
const utility_1 = require("@poseidon-zkp/poseidon-zk-jssdk/src/shuffle/utility");
const path_1 = require("path");
async function player_run(SM, owner, gameId) {
    console.log("Player ", owner.address.slice(0, 6).concat("..."), "init shuffle context!");
    const numCards = (await SM.getNumCards(gameId)).toNumber();
    let encrypt_wasm;
    let encrypt_zkey;
    if (numCards == 5) {
        (encrypt_wasm = (0, path_1.resolve)(utility_1.P0X_DIR, "./wasm/encrypt.wasm.5")),
            (encrypt_zkey = (0, path_1.resolve)(utility_1.P0X_DIR, "./zkey/encrypt.zkey.5"));
    }
    else if (numCards == 30) {
        (encrypt_wasm = (0, path_1.resolve)(utility_1.P0X_DIR, "./wasm/encrypt.wasm.30")),
            (encrypt_zkey = (0, path_1.resolve)(utility_1.P0X_DIR, "./zkey/encrypt.zkey.30"));
    }
    else if (numCards == 52) {
        (encrypt_wasm = (0, path_1.resolve)(utility_1.P0X_DIR, "./wasm/encrypt.wasm")),
            (encrypt_zkey = (0, path_1.resolve)(utility_1.P0X_DIR, "./zkey/encrypt.zkey"));
    }
    const player = await zkShuffle_1.ZKShuffle.create(SM.address, owner, await zkShuffle_1.ZKShuffle.generateShuffleSecret(), (0, path_1.resolve)(utility_1.P0X_DIR, "./wasm/decrypt.wasm"), (0, path_1.resolve)(utility_1.P0X_DIR, "./zkey/decrypt.zkey"), encrypt_wasm, encrypt_zkey);
    let playerIdx = await player.joinGame(gameId);
    console.log("Player ", owner.address.slice(0, 6).concat("..."), "Join Game ", gameId, " asigned playerId ", playerIdx);
    let turn = zkShuffle_1.GameTurn.NOP;
    while (turn != zkShuffle_1.GameTurn.Complete) {
        turn = await player.checkTurn(gameId);
        if (turn != zkShuffle_1.GameTurn.NOP) {
            switch (turn) {
                case zkShuffle_1.GameTurn.Shuffle:
                    console.log("Player ", playerIdx, " 's Shuffle turn!");
                    await player.shuffle(gameId);
                    break;
                case zkShuffle_1.GameTurn.Deal:
                    console.log("Player ", playerIdx, " 's Deal Decrypt turn!");
                    await player.draw(gameId);
                    break;
                case zkShuffle_1.GameTurn.Open:
                    console.log("Player ", playerIdx, " 's Open Decrypt turn!");
                    let cards = await player.openOffchain(gameId, [playerIdx]);
                    console.log("Player ", playerIdx, " open offchain hand card ", cards[0]);
                    cards = await player.open(gameId, [playerIdx]);
                    console.log("Player ", playerIdx, " open onchain hand card ", cards[0]);
                    break;
                case zkShuffle_1.GameTurn.Complete:
                    console.log("Player ", playerIdx, " 's Game End!");
                    break;
                default:
                    console.log("err turn ", turn);
                    (0, process_1.exit)(-1);
            }
        }
        await (0, utility_1.sleep)(1000);
    }
}
async function fullprocess(numCard) {
    const signers = await hardhat_1.ethers.getSigners();
    const sm_owner = signers[10];
    const hilo_owner = signers[11];
    const players = signers;
    const SM = await (0, deploy_1.deploy_shuffle_manager)(sm_owner);
    const game = await new types_1.Hilo__factory(hilo_owner).deploy(SM.address, numCard);
    await (await game.connect(players[0]).newGame()).wait();
    const gameId = (await game.largestGameId()).toNumber();
    console.log("Player ", players[0].address.slice(0, 6).concat("..."), "Create Game ", gameId);
    await (await game.connect(players[0]).allowJoinGame(gameId)).wait();
    await Promise.all([player_run(SM, players[0], gameId), player_run(SM, players[1], gameId)]);
}
describe("ZKShuffle E2E test", function () {
    before(async () => {
        await Promise.all([
            "wasm/decrypt.wasm",
            "zkey/decrypt.zkey",
            "wasm/encrypt.wasm.5",
            "zkey/encrypt.zkey.5",
            "wasm/encrypt.wasm.30",
            "zkey/encrypt.zkey.30",
            "wasm/encrypt.wasm",
            "zkey/encrypt.zkey",
        ].map(async (e) => {
            await (0, utility_1.dnld_aws)(e);
        }));
    });
    it("Hilo E2E 5 card", async () => {
        await fullprocess(5);
    });
    it("Hilo E2E 30 card", async () => {
        await fullprocess(30);
    });
    it("Hilo E2E 52 card", async () => {
        await fullprocess(52);
    });
});
//# sourceMappingURL=e2e.js.map