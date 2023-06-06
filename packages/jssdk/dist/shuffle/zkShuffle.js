var _a;
import { shuffleEncryptV2Plaintext } from "@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/plaintext";
import { dealMultiCompressedCard, generateDecryptProof, generateShuffleEncryptV2Proof, packToSolidityProof, } from "@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/proof";
import { initDeck, prepareShuffleDeck, sampleFieldElements, samplePermutation, } from "@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/utilities";
import { ethers } from "ethers";
import shuffleManagerJson from "./ABI/ShuffleManager.json";
const buildBabyjub = require("circomlibjs").buildBabyjub;
const Scalar = require("ffjavascript").Scalar;
export var BaseState;
(function (BaseState) {
    BaseState[BaseState["Uncreated"] = 0] = "Uncreated";
    BaseState[BaseState["Created"] = 1] = "Created";
    BaseState[BaseState["Registration"] = 2] = "Registration";
    BaseState[BaseState["Shuffle"] = 3] = "Shuffle";
    BaseState[BaseState["Deal"] = 4] = "Deal";
    BaseState[BaseState["Open"] = 5] = "Open";
    BaseState[BaseState["GameError"] = 6] = "GameError";
    BaseState[BaseState["Complete"] = 7] = "Complete";
})(BaseState || (BaseState = {}));
export var GameTurn;
(function (GameTurn) {
    GameTurn[GameTurn["NOP"] = 0] = "NOP";
    GameTurn[GameTurn["Shuffle"] = 1] = "Shuffle";
    GameTurn[GameTurn["Deal"] = 2] = "Deal";
    GameTurn[GameTurn["Open"] = 3] = "Open";
    GameTurn[GameTurn["Complete"] = 4] = "Complete";
    GameTurn[GameTurn["Error"] = 5] = "Error";
})(GameTurn || (GameTurn = {}));
export class ZKShuffle {
    constructor(shuffleManagerContract, signer) {
        this.signer = signer;
        this.smc = new ethers.Contract(shuffleManagerContract, shuffleManagerJson.abi, signer);
        this.nextBlockPerGame = new Map();
    }
    async init(seed, decrypt_wasm, decrypt_zkey, encrypt_wasm, encrypt_zkey) {
        this.decrypt_wasm = decrypt_wasm;
        this.decrypt_zkey = decrypt_zkey;
        this.encrypt_wasm = encrypt_wasm;
        this.encrypt_zkey = encrypt_zkey;
        this.babyjub = await buildBabyjub();
        if (seed >= this.babyjub.p) {
            throw new Error("Seed is too large");
        }
        this.sk = seed;
        const keys = this.babyjub.mulPointEscalar(this.babyjub.Base8, this.sk);
        this.pk = [this.babyjub.F.toString(keys[0]), this.babyjub.F.toString(keys[1])];
    }
    static async generateShuffleSecret() {
        const babyjub = await buildBabyjub();
        const threshold = Scalar.exp(2, 251);
        let secret;
        do {
            secret = Scalar.fromRprLE(babyjub.F.random());
        } while (Scalar.geq(secret, threshold));
        return secret;
    }
    async joinGame(gameId) {
        const address = await this.signer.getAddress();
        await (await this.smc.playerRegister(gameId, address, this.pk[0], this.pk[1])).wait();
        return await this.getPlayerId(gameId);
    }
    // pull player's Id for gameId
    async getPlayerId(gameId) {
        const address = await this.signer.getAddress();
        return (await this.smc.getPlayerIdx(gameId, address)).toNumber();
    }
    async checkTurn(gameId, startBlock = 0) {
        var _b, _c;
        if (startBlock === undefined || startBlock === 0) {
            startBlock = this.nextBlockPerGame.get(gameId);
            if (startBlock === undefined) {
                startBlock = 0;
            }
        }
        const filter = this.smc.filters.PlayerTurn(null, null, null);
        const events = await this.smc.queryFilter(filter, startBlock);
        for (let i = 0; i < events.length; i++) {
            const e = events[i];
            startBlock = e.blockNumber + 1; // TODO : probably missing event in same block
            if (((_b = e === null || e === void 0 ? void 0 : e.args) === null || _b === void 0 ? void 0 : _b.gameId.toNumber()) !== gameId ||
                ((_c = e === null || e === void 0 ? void 0 : e.args) === null || _c === void 0 ? void 0 : _c.playerIndex.toNumber()) !== (await this.getPlayerId(gameId))) {
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
    }
    async generate_shuffle_proof(gameId) {
        const numBits = BigInt(251);
        const numCards = (await this.smc.getNumCards(gameId)).toNumber();
        const key = await this.smc.queryAggregatedPk(gameId);
        const aggrPK = [key[0].toBigInt(), key[1].toBigInt()];
        const aggrPKEC = [this.babyjub.F.e(aggrPK[0]), this.babyjub.F.e(aggrPK[1])];
        const deck = await this.smc.queryDeck(gameId);
        const preprocessedDeck = prepareShuffleDeck(this.babyjub, deck, numCards);
        const A = samplePermutation(Number(numCards));
        const R = sampleFieldElements(this.babyjub, numBits, BigInt(numCards));
        const plaintext_output = shuffleEncryptV2Plaintext(this.babyjub, numCards, A, R, aggrPKEC, preprocessedDeck.X0, preprocessedDeck.X1, preprocessedDeck.Delta[0], preprocessedDeck.Delta[1], preprocessedDeck.Selector);
        return await generateShuffleEncryptV2Proof(aggrPK, A, R, preprocessedDeck.X0, preprocessedDeck.X1, preprocessedDeck.Delta[0], preprocessedDeck.Delta[1], preprocessedDeck.Selector, plaintext_output.X0, plaintext_output.X1, plaintext_output.delta0, plaintext_output.delta1, plaintext_output.selector, this.encrypt_wasm, this.encrypt_zkey);
    }
    // Queries the current deck from contract, shuffles & generates ZK proof locally, and updates the deck on contract.
    async _shuffle(gameId) {
        const numCards = (await this.smc.getNumCards(gameId)).toNumber();
        const shuffleFullProof = await this.generate_shuffle_proof(gameId);
        const solidityProof = packToSolidityProof(shuffleFullProof.proof);
        await (await this.smc.playerShuffle(gameId, solidityProof, {
            config: await this.smc.cardConfig(gameId),
            X0: shuffleFullProof.publicSignals.slice(3 + numCards * 2, 3 + numCards * 3),
            X1: shuffleFullProof.publicSignals.slice(3 + numCards * 3, 3 + numCards * 4),
            selector0: { _data: shuffleFullProof.publicSignals[5 + numCards * 4] },
            selector1: { _data: shuffleFullProof.publicSignals[6 + numCards * 4] },
        })).wait();
    }
    async shuffle(gameId) {
        const start = Date.now();
        await this._shuffle(gameId);
        console.log("Player ", await this.getPlayerId(gameId), " Shuffled in ", Date.now() - start, "ms");
        return true;
    }
    async decrypt(gameId, cards) {
        const numCards = (await this.smc.getNumCards(gameId)).toNumber();
        await dealMultiCompressedCard(this.babyjub, numCards, gameId, cards, this.sk, this.pk, this.smc, this.decrypt_wasm, this.decrypt_zkey);
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
    async draw(gameId) {
        const start = Date.now();
        const cardsToDeal = (await this.smc.queryDeck(gameId)).cardsToDeal._data.toNumber();
        await this.decrypt(gameId, this.getSetBitsPositions(cardsToDeal));
        console.log("Player ", await this.getPlayerId(gameId), " Drawed in ", Date.now() - start, "ms");
        return true;
    }
    async getOpenProof(gameId, cardIds) {
        // remove duplicate card ids
        cardIds = cardIds.filter((v, i, a) => a.indexOf(v) === i);
        // sort card ids
        cardIds = cardIds.sort((n1, n2) => n1 - n2);
        const start = Date.now();
        const deck = await this.smc.queryDeck(gameId);
        const decryptedCards = [];
        const proofs = [];
        let cardMap = 0;
        for (let i = 0; i < cardIds.length; i++) {
            const cardId = cardIds[i];
            cardMap += 1 << cardId;
            const decryptProof = await generateDecryptProof([
                deck.X0[cardId].toBigInt(),
                deck.Y0[cardId].toBigInt(),
                deck.X1[cardId].toBigInt(),
                deck.Y1[cardId].toBigInt(),
            ], this.sk, this.pk, this.decrypt_wasm, this.decrypt_zkey);
            decryptedCards.push({
                X: decryptProof.publicSignals[0],
                Y: decryptProof.publicSignals[1],
            });
            proofs.push(packToSolidityProof(decryptProof.proof));
        }
        console.log("generate open card proof in ", Date.now() - start, "ms");
        return {
            cardMap,
            decryptedCards,
            proofs,
        };
    }
    queryCardsPerX(px, numCards) {
        const deck = initDeck(this.babyjub, numCards);
        for (let i = 0; i < numCards; i++) {
            if (BigInt(px) === deck[2 * numCards + i]) {
                return i;
            }
        }
        return -1;
    }
    async openOffchain(gameId, cardIds) {
        const numCards = (await this.smc.getNumCards(gameId)).toNumber();
        const { decryptedCards } = await this.getOpenProof(gameId, cardIds);
        const cards = [];
        for (let i = 0; i < decryptedCards.length; i++) {
            cards.push(this.queryCardsPerX(decryptedCards[i].X, numCards));
        }
        return cards;
    }
    async queryCards(gameId, cardIds) {
        const cards = [];
        for (let i = 0; i < cardIds.length; i++) {
            const cardId = cardIds[i];
            cards.push((await this.smc.queryCardValue(gameId, cardId)).toNumber());
        }
        return cards;
    }
    async open(gameId, cardIds) {
        const { cardMap, decryptedCards, proofs } = await this.getOpenProof(gameId, cardIds);
        await (await this.smc.playerOpenCards(gameId, {
            _data: cardMap,
        }, proofs, decryptedCards)).wait();
        return await this.queryCards(gameId, cardIds);
    }
}
_a = ZKShuffle;
ZKShuffle.create = async (shuffleManagerContract, signer, seed, decrypt_wasm = "", decrypt_zkey = "", encrypt_wasm = "", encrypt_zkey = "") => {
    const ctx = new ZKShuffle(shuffleManagerContract, signer);
    await ctx.init(seed, decrypt_wasm, decrypt_zkey, encrypt_wasm, encrypt_zkey);
    return ctx;
};
//# sourceMappingURL=zkShuffle.js.map