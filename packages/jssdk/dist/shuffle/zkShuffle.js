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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZKShuffle = exports.GameTurn = exports.BaseState = void 0;
const plaintext_1 = require("@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/plaintext");
const proof_1 = require("@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/proof");
const utilities_1 = require("@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/utilities");
const ethers_1 = require("ethers");
const ShuffleManager_json_1 = __importDefault(require("./ABI/ShuffleManager.json"));
const buildBabyjub = require("circomlibjs").buildBabyjub;
const Scalar = require("ffjavascript").Scalar;
var BaseState;
(function (BaseState) {
    BaseState[BaseState["Uncreated"] = 0] = "Uncreated";
    BaseState[BaseState["Created"] = 1] = "Created";
    BaseState[BaseState["Registration"] = 2] = "Registration";
    BaseState[BaseState["Shuffle"] = 3] = "Shuffle";
    BaseState[BaseState["Deal"] = 4] = "Deal";
    BaseState[BaseState["Open"] = 5] = "Open";
    BaseState[BaseState["GameError"] = 6] = "GameError";
    BaseState[BaseState["Complete"] = 7] = "Complete";
})(BaseState = exports.BaseState || (exports.BaseState = {}));
var GameTurn;
(function (GameTurn) {
    GameTurn[GameTurn["NOP"] = 0] = "NOP";
    GameTurn[GameTurn["Shuffle"] = 1] = "Shuffle";
    GameTurn[GameTurn["Deal"] = 2] = "Deal";
    GameTurn[GameTurn["Open"] = 3] = "Open";
    GameTurn[GameTurn["Complete"] = 4] = "Complete";
    GameTurn[GameTurn["Error"] = 5] = "Error";
})(GameTurn = exports.GameTurn || (exports.GameTurn = {}));
class ZKShuffle {
    constructor(shuffleManagerContract, signer) {
        this.signer = signer;
        this.smc = new ethers_1.ethers.Contract(shuffleManagerContract, ShuffleManager_json_1.default.abi, signer);
        this.nextBlockPerGame = new Map();
    }
    init(seed, decrypt_wasm, decrypt_zkey, encrypt_wasm, encrypt_zkey) {
        return __awaiter(this, void 0, void 0, function* () {
            this.decrypt_wasm = decrypt_wasm;
            this.decrypt_zkey = decrypt_zkey;
            this.encrypt_wasm = encrypt_wasm;
            this.encrypt_zkey = encrypt_zkey;
            this.babyjub = yield buildBabyjub();
            if (seed >= this.babyjub.p) {
                throw new Error("Seed is too large");
            }
            this.sk = seed;
            const keys = this.babyjub.mulPointEscalar(this.babyjub.Base8, this.sk);
            this.pk = [this.babyjub.F.toString(keys[0]), this.babyjub.F.toString(keys[1])];
        });
    }
    static generateShuffleSecret() {
        return __awaiter(this, void 0, void 0, function* () {
            const babyjub = yield buildBabyjub();
            const threshold = Scalar.exp(2, 251);
            let secret;
            do {
                secret = Scalar.fromRprLE(babyjub.F.random());
            } while (Scalar.geq(secret, threshold));
            return secret;
        });
    }
    joinGame(gameId) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = yield this.signer.getAddress();
            yield (yield this.smc.playerRegister(gameId, address, this.pk[0], this.pk[1])).wait();
            return yield this.getPlayerId(gameId);
        });
    }
    getPlayerId(gameId) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = yield this.signer.getAddress();
            return (yield this.smc.getPlayerIdx(gameId, address)).toNumber();
        });
    }
    checkTurn(gameId, startBlock = 0) {
        var _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            if (startBlock === undefined || startBlock === 0) {
                startBlock = this.nextBlockPerGame.get(gameId);
                if (startBlock === undefined) {
                    startBlock = 0;
                }
            }
            const filter = this.smc.filters.PlayerTurn(null, null, null);
            const events = yield this.smc.queryFilter(filter, startBlock);
            for (let i = 0; i < events.length; i++) {
                const e = events[i];
                startBlock = e.blockNumber + 1;
                if (((_b = e === null || e === void 0 ? void 0 : e.args) === null || _b === void 0 ? void 0 : _b.gameId.toNumber()) !== gameId ||
                    ((_c = e === null || e === void 0 ? void 0 : e.args) === null || _c === void 0 ? void 0 : _c.playerIndex.toNumber()) !== (yield this.getPlayerId(gameId))) {
                    continue;
                }
                this.nextBlockPerGame.set(gameId, startBlock);
                switch (e.args.state) {
                    case BaseState.Shuffle:
                        return GameTurn.Shuffle;
                    case BaseState.Deal:
                        return GameTurn.Deal;
                    case BaseState.Open:
                        return GameTurn.Open;
                    case BaseState.Complete:
                        return GameTurn.Complete;
                    case BaseState.GameError:
                        return GameTurn.Error;
                    default:
                        console.log("err state ", e.args.state);
                        break;
                }
            }
            this.nextBlockPerGame.set(gameId, startBlock);
            return GameTurn.NOP;
        });
    }
    generate_shuffle_proof(gameId) {
        return __awaiter(this, void 0, void 0, function* () {
            const numBits = BigInt(251);
            const numCards = (yield this.smc.getNumCards(gameId)).toNumber();
            const key = yield this.smc.queryAggregatedPk(gameId);
            const aggrPK = [key[0].toBigInt(), key[1].toBigInt()];
            const aggrPKEC = [this.babyjub.F.e(aggrPK[0]), this.babyjub.F.e(aggrPK[1])];
            const deck = yield this.smc.queryDeck(gameId);
            const preprocessedDeck = (0, utilities_1.prepareShuffleDeck)(this.babyjub, deck, numCards);
            const A = (0, utilities_1.samplePermutation)(Number(numCards));
            const R = (0, utilities_1.sampleFieldElements)(this.babyjub, numBits, BigInt(numCards));
            const plaintext_output = (0, plaintext_1.shuffleEncryptV2Plaintext)(this.babyjub, numCards, A, R, aggrPKEC, preprocessedDeck.X0, preprocessedDeck.X1, preprocessedDeck.Delta[0], preprocessedDeck.Delta[1], preprocessedDeck.Selector);
            return yield (0, proof_1.generateShuffleEncryptV2Proof)(aggrPK, A, R, preprocessedDeck.X0, preprocessedDeck.X1, preprocessedDeck.Delta[0], preprocessedDeck.Delta[1], preprocessedDeck.Selector, plaintext_output.X0, plaintext_output.X1, plaintext_output.delta0, plaintext_output.delta1, plaintext_output.selector, this.encrypt_wasm, this.encrypt_zkey);
        });
    }
    _shuffle(gameId) {
        return __awaiter(this, void 0, void 0, function* () {
            const numCards = (yield this.smc.getNumCards(gameId)).toNumber();
            const shuffleFullProof = yield this.generate_shuffle_proof(gameId);
            const solidityProof = (0, proof_1.packToSolidityProof)(shuffleFullProof.proof);
            yield (yield this.smc.playerShuffle(gameId, solidityProof, {
                config: yield this.smc.cardConfig(gameId),
                X0: shuffleFullProof.publicSignals.slice(3 + numCards * 2, 3 + numCards * 3),
                X1: shuffleFullProof.publicSignals.slice(3 + numCards * 3, 3 + numCards * 4),
                selector0: { _data: shuffleFullProof.publicSignals[5 + numCards * 4] },
                selector1: { _data: shuffleFullProof.publicSignals[6 + numCards * 4] },
            })).wait();
        });
    }
    shuffle(gameId) {
        return __awaiter(this, void 0, void 0, function* () {
            const start = Date.now();
            yield this._shuffle(gameId);
            console.log("Player ", yield this.getPlayerId(gameId), " Shuffled in ", Date.now() - start, "ms");
            return true;
        });
    }
    decrypt(gameId, cards) {
        return __awaiter(this, void 0, void 0, function* () {
            const numCards = (yield this.smc.getNumCards(gameId)).toNumber();
            yield (0, proof_1.dealMultiCompressedCard)(this.babyjub, numCards, gameId, cards, this.sk, this.pk, this.smc, this.decrypt_wasm, this.decrypt_zkey);
        });
    }
    getSetBitsPositions(num) {
        const binaryString = num.toString(2);
        const setBitsPositions = [];
        for (let i = binaryString.length - 1; i >= 0; i--) {
            if (binaryString[i] === "1") {
                setBitsPositions.push(binaryString.length - 1 - i);
            }
        }
        return setBitsPositions;
    }
    draw(gameId) {
        return __awaiter(this, void 0, void 0, function* () {
            const start = Date.now();
            const cardsToDeal = (yield this.smc.queryDeck(gameId)).cardsToDeal._data.toNumber();
            yield this.decrypt(gameId, this.getSetBitsPositions(cardsToDeal));
            console.log("Player ", yield this.getPlayerId(gameId), " Drawed in ", Date.now() - start, "ms");
            return true;
        });
    }
    getOpenProof(gameId, cardIds) {
        return __awaiter(this, void 0, void 0, function* () {
            cardIds = cardIds.filter((v, i, a) => a.indexOf(v) === i);
            cardIds = cardIds.sort((n1, n2) => n1 - n2);
            const start = Date.now();
            const deck = yield this.smc.queryDeck(gameId);
            const decryptedCards = [];
            const proofs = [];
            let cardMap = 0;
            for (let i = 0; i < cardIds.length; i++) {
                const cardId = cardIds[i];
                cardMap += 1 << cardId;
                const decryptProof = yield (0, proof_1.generateDecryptProof)([
                    deck.X0[cardId].toBigInt(),
                    deck.Y0[cardId].toBigInt(),
                    deck.X1[cardId].toBigInt(),
                    deck.Y1[cardId].toBigInt(),
                ], this.sk, this.pk, this.decrypt_wasm, this.decrypt_zkey);
                decryptedCards.push({
                    X: decryptProof.publicSignals[0],
                    Y: decryptProof.publicSignals[1],
                });
                proofs.push((0, proof_1.packToSolidityProof)(decryptProof.proof));
            }
            console.log("generate open card proof in ", Date.now() - start, "ms");
            return {
                cardMap,
                decryptedCards,
                proofs,
            };
        });
    }
    queryCardsPerX(px, numCards) {
        const deck = (0, utilities_1.initDeck)(this.babyjub, numCards);
        for (let i = 0; i < numCards; i++) {
            if (BigInt(px) === deck[2 * numCards + i]) {
                return i;
            }
        }
        return -1;
    }
    openOffchain(gameId, cardIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const numCards = (yield this.smc.getNumCards(gameId)).toNumber();
            const { decryptedCards } = yield this.getOpenProof(gameId, cardIds);
            const cards = [];
            for (let i = 0; i < decryptedCards.length; i++) {
                cards.push(this.queryCardsPerX(decryptedCards[i].X, numCards));
            }
            return cards;
        });
    }
    queryCards(gameId, cardIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const cards = [];
            for (let i = 0; i < cardIds.length; i++) {
                const cardId = cardIds[i];
                cards.push((yield this.smc.queryCardValue(gameId, cardId)).toNumber());
            }
            return cards;
        });
    }
    open(gameId, cardIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const { cardMap, decryptedCards, proofs } = yield this.getOpenProof(gameId, cardIds);
            yield (yield this.smc.playerOpenCards(gameId, {
                _data: cardMap,
            }, proofs, decryptedCards)).wait();
            return yield this.queryCards(gameId, cardIds);
        });
    }
}
exports.ZKShuffle = ZKShuffle;
_a = ZKShuffle;
ZKShuffle.create = (shuffleManagerContract, signer, seed, decrypt_wasm = "", decrypt_zkey = "", encrypt_wasm = "", encrypt_zkey = "") => __awaiter(void 0, void 0, void 0, function* () {
    const ctx = new ZKShuffle(shuffleManagerContract, signer);
    yield ctx.init(seed, decrypt_wasm, decrypt_zkey, encrypt_wasm, encrypt_zkey);
    return ctx;
});
//# sourceMappingURL=zkShuffle.js.map