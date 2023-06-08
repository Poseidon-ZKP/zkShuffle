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
const proof_1 = require("@poseidon-zkp/poseidon-zk-proof/src/shuffle/proof");
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const zkShuffle_1 = require("@poseidon-zkp/poseidon-zk-jssdk/src/shuffle/zkShuffle");
const deploy_1 = require("../helper/deploy");
const utility_1 = require("../helper/utility");
const types_1 = require("../types");
const path_1 = require("path");
const utility_2 = require("@poseidon-zkp/poseidon-zk-jssdk/src/shuffle/utility");
describe("ZKShuffle Unit Test", function () {
    this.timeout(6000000);
    let players = [];
    let numPlayer;
    let sm_owner;
    let game_owner;
    let SM;
    let game;
    let gameId;
    before(() => __awaiter(this, void 0, void 0, function* () {
        const signers = yield hardhat_1.ethers.getSigners();
        sm_owner = signers[10];
        game_owner = signers[11];
        numPlayer = 2;
        console.log("numPlayer : ", numPlayer);
        yield Promise.all([
            "wasm/decrypt.wasm",
            "zkey/decrypt.zkey",
            "wasm/encrypt.wasm.5",
            "zkey/encrypt.zkey.5",
            "wasm/encrypt.wasm",
            "zkey/encrypt.zkey",
        ].map((e) => __awaiter(this, void 0, void 0, function* () {
            yield (0, utility_2.dnld_aws)(e);
        })));
    }));
    it("Deploy Shuffle Manager", () => __awaiter(this, void 0, void 0, function* () {
        const signers = yield hardhat_1.ethers.getSigners();
        SM = yield (0, deploy_1.deploy_shuffle_manager)(sm_owner);
        for (let i = 0; i < numPlayer; i++) {
            players.push(yield zkShuffle_1.ZKShuffle.create(SM.address, signers[i], yield zkShuffle_1.ZKShuffle.generateShuffleSecret(), (0, path_1.resolve)(utility_2.P0X_DIR, "./wasm/decrypt.wasm"), (0, path_1.resolve)(utility_2.P0X_DIR, "./zkey/decrypt.zkey"), (0, path_1.resolve)(utility_2.P0X_DIR, "./wasm/encrypt.wasm.5"), (0, path_1.resolve)(utility_2.P0X_DIR, "./zkey/encrypt.zkey.5")));
        }
    }));
    it("Deploy Dummy Game Contract", () => __awaiter(this, void 0, void 0, function* () {
        game = yield new types_1.ShuffleTest__factory(game_owner).deploy(SM.address);
    }));
    it("Create Shuffle Game", () => __awaiter(this, void 0, void 0, function* () {
        function createShuffleGame(numPlayer, owner) {
            return __awaiter(this, void 0, void 0, function* () {
                const calldata = SM.interface.encodeFunctionData("createShuffleGame", [numPlayer]);
                yield (0, utility_1.tx_to_contract)(owner, game.address, calldata);
            });
        }
        yield createShuffleGame(numPlayer, players[0].signer);
        gameId = (yield SM.largestGameId()).toNumber();
        (0, chai_1.expect)((yield SM.gameState(gameId)).toNumber()).equal(zkShuffle_1.BaseState.Created);
    }));
    it("Move to Register State", () => __awaiter(this, void 0, void 0, function* () {
        function moveToRegister(gameId, owner) {
            return __awaiter(this, void 0, void 0, function* () {
                const next = game.interface.encodeFunctionData("dummy");
                const calldata = SM.interface.encodeFunctionData("register", [gameId, next]);
                yield (0, utility_1.tx_to_contract)(owner, game.address, calldata);
            });
        }
        yield moveToRegister(gameId, players[0].signer);
        (0, chai_1.expect)((yield SM.gameState(gameId)).toNumber()).equal(zkShuffle_1.BaseState.Registration);
    }));
    it("Player Register", () => __awaiter(this, void 0, void 0, function* () {
        function playerRegister(gameId, signAddr, pkX, pkY, owner) {
            return __awaiter(this, void 0, void 0, function* () {
                const calldata = SM.interface.encodeFunctionData("playerRegister", [
                    gameId,
                    signAddr,
                    pkX,
                    pkY,
                ]);
                yield (0, utility_1.tx_to_contract)(owner, game.address, calldata);
            });
        }
        for (let i = 0; i < numPlayer; i++) {
            yield playerRegister(gameId, yield players[i].signer.getAddress(), players[i].pk[0], players[i].pk[1], players[i].signer);
        }
    }));
    it("Move to Shuffle", () => __awaiter(this, void 0, void 0, function* () {
        function moveToShuffle(gameId, owner) {
            return __awaiter(this, void 0, void 0, function* () {
                const next = game.interface.encodeFunctionData("dummy");
                const calldata = SM.interface.encodeFunctionData("shuffle", [gameId, next]);
                yield (0, utility_1.tx_to_contract)(owner, game.address, calldata);
            });
        }
        yield moveToShuffle(gameId, players[0].signer);
        (0, chai_1.expect)((yield SM.gameState(gameId)).toNumber()).equal(zkShuffle_1.BaseState.Shuffle);
    }));
    it("Player Shuffle", () => __awaiter(this, void 0, void 0, function* () {
        function playerShuffle(gameId, player) {
            return __awaiter(this, void 0, void 0, function* () {
                const numCards = (yield SM.getNumCards(gameId)).toNumber();
                let shuffleFullProof = yield player.generate_shuffle_proof(gameId);
                let solidityProof = (0, proof_1.packToSolidityProof)(shuffleFullProof.proof);
                let compressDeck = {
                    config: yield SM.cardConfig(gameId),
                    X0: shuffleFullProof.publicSignals.slice(3 + numCards * 2, 3 + numCards * 3),
                    X1: shuffleFullProof.publicSignals.slice(3 + numCards * 3, 3 + numCards * 4),
                    selector0: { _data: shuffleFullProof.publicSignals[5 + numCards * 4] },
                    selector1: { _data: shuffleFullProof.publicSignals[6 + numCards * 4] },
                };
                const calldata = SM.interface.encodeFunctionData("playerShuffle", [
                    gameId,
                    solidityProof,
                    compressDeck,
                ]);
                yield (0, utility_1.tx_to_contract)(player.signer, game.address, calldata);
            });
        }
        for (let i = 0; i < numPlayer; i++) {
            console.log("Player ", i, " Shuffling");
            const start = Date.now();
            yield playerShuffle(gameId, players[i]);
            console.log("Player ", i, " Shuffled in ", Date.now() - start, "ms");
        }
    }));
});
//# sourceMappingURL=unit.js.map