"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dealMultiCompressedCard = exports.dealUncompressedCard = exports.dealCompressedCard = exports.deal = exports.shuffle = exports.generateShuffleEncryptV2Proof = exports.generateDecryptProof = exports.packToSolidityProof = void 0;
const proof_1 = require("@semaphore-protocol/proof");
Object.defineProperty(exports, "packToSolidityProof", { enumerable: true, get: function () { return proof_1.packToSolidityProof; } });
const utilities_1 = require("./utilities");
const plaintext_1 = require("./plaintext");
const snarkjs = require("snarkjs");
async function generateDecryptProof(Y, skP, pkP, wasmFile, zkeyFile) {
    return await snarkjs.groth16.fullProve({ Y, skP, pkP }, wasmFile, zkeyFile);
}
exports.generateDecryptProof = generateDecryptProof;
async function generateShuffleEncryptV2Proof(pk, A, R, UX0, UX1, UDelta0, UDelta1, s_u, VX0, VX1, VDelta0, VDelta1, s_v, wasmFile, zkeyFile) {
    return await snarkjs.groth16.fullProve({
        pk,
        A,
        R,
        UX0,
        UX1,
        UDelta0,
        UDelta1,
        VX0,
        VX1,
        VDelta0,
        VDelta1,
        s_u,
        s_v,
    }, wasmFile, zkeyFile);
}
exports.generateShuffleEncryptV2Proof = generateShuffleEncryptV2Proof;
async function shuffle(babyjub, A, R, aggregatedPk, numCards, gameId, playerAddr, gameContract, stateMachineContract, shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile) {
    const deck = await stateMachineContract.queryDeck(gameId);
    const aggregatedPkEC = [babyjub.F.e(aggregatedPk[0]), babyjub.F.e(aggregatedPk[1])];
    const preprocessedDeck = (0, utilities_1.prepareShuffleDeck)(babyjub, deck, numCards);
    const plaintext_output = (0, plaintext_1.shuffleEncryptV2Plaintext)(babyjub, numCards, A, R, aggregatedPkEC, preprocessedDeck.X0, preprocessedDeck.X1, preprocessedDeck.Delta[0], preprocessedDeck.Delta[1], preprocessedDeck.Selector);
    const shuffleEncryptV2Output = await generateShuffleEncryptV2Proof(aggregatedPk, A, R, preprocessedDeck.X0, preprocessedDeck.X1, preprocessedDeck.Delta[0], preprocessedDeck.Delta[1], preprocessedDeck.Selector, plaintext_output.X0, plaintext_output.X1, plaintext_output.delta0, plaintext_output.delta1, plaintext_output.selector, shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile);
    const solidityProof = (0, proof_1.packToSolidityProof)(shuffleEncryptV2Output.proof);
    await stateMachineContract
        .connect(gameContract)
        .shuffle(playerAddr, solidityProof, shuffleEncryptV2Output.publicSignals.slice(3 + numCards * 2, 3 + numCards * 3), shuffleEncryptV2Output.publicSignals.slice(3 + numCards * 3, 3 + numCards * 4), [
        shuffleEncryptV2Output.publicSignals[5 + numCards * 4],
        shuffleEncryptV2Output.publicSignals[6 + numCards * 4],
    ], gameId);
}
exports.shuffle = shuffle;
async function deal(babyjub, numCards, gameId, cardIdx, curPlayerIdx, sk, pk, playerAddr, gameContract, stateMachineContract, decryptWasmFile, decryptZkeyFile, isFirstDecryption) {
    if (isFirstDecryption) {
        await dealCompressedCard(babyjub, numCards, gameId, cardIdx, sk, pk, stateMachineContract, decryptWasmFile, decryptZkeyFile);
        return [];
    }
    else {
        return await dealUncompressedCard(gameId, cardIdx, sk, pk, stateMachineContract, decryptWasmFile, decryptZkeyFile);
    }
}
exports.deal = deal;
async function dealCompressedCard(babyjub, numCards, gameId, cardIdx, sk, pk, stateMachineContract, decryptWasmFile, decryptZkeyFile) {
    const deck = await stateMachineContract.queryDeck(gameId);
    const Y = (0, utilities_1.prepareDecryptData)(babyjub, deck.X0[cardIdx], deck.X1[cardIdx], deck.selector0._data, deck.selector1._data, Number(numCards), cardIdx);
    const decryptProof = await generateDecryptProof(Y, sk, pk, decryptWasmFile, decryptZkeyFile);
    const solidityProof = (0, proof_1.packToSolidityProof)(decryptProof.proof);
    const res = await (await stateMachineContract.playerDealCards(gameId, [solidityProof], [
        {
            X: decryptProof.publicSignals[0],
            Y: decryptProof.publicSignals[1],
        },
    ], [[(0, utilities_1.ecX2Delta)(babyjub, Y[0]), (0, utilities_1.ecX2Delta)(babyjub, Y[2])]])).wait();
}
exports.dealCompressedCard = dealCompressedCard;
async function dealUncompressedCard(gameId, cardIdx, sk, pk, stateMachineContract, decryptWasmFile, decryptZkeyFile) {
    const deck = await stateMachineContract.queryDeck(gameId);
    const decryptProof = await generateDecryptProof([deck.X0[cardIdx], deck.X1[cardIdx], deck.selector0._data, deck.selector1._data], sk, pk, decryptWasmFile, decryptZkeyFile);
    const solidityProof = (0, proof_1.packToSolidityProof)(decryptProof.proof);
    await stateMachineContract.playerDealCards(gameId, [solidityProof], [
        {
            X: decryptProof.publicSignals[0],
            Y: decryptProof.publicSignals[1],
        },
    ], [[0, 0]]);
    return [BigInt(decryptProof.publicSignals[0]), BigInt(decryptProof.publicSignals[1])];
}
exports.dealUncompressedCard = dealUncompressedCard;
async function dealMultiCompressedCard(babyjub, numCards, gameId, cards, sk, pk, stateMachineContract, decryptWasmFile, decryptZkeyFile) {
    const proofs = [];
    const decryptedDatas = [];
    const initDeltas = [];
    for (let i = 0; i < cards.length; i++) {
        const deck = await stateMachineContract.queryDeck(gameId);
        const Y = (0, utilities_1.prepareDecryptData)(babyjub, deck.X0[cards[i]], deck.X1[cards[i]], deck.selector0._data, deck.selector1._data, Number(numCards), cards[i]);
        const decryptProof = await generateDecryptProof(Y, sk, pk, decryptWasmFile, decryptZkeyFile);
        const solidityProof = (0, proof_1.packToSolidityProof)(decryptProof.proof);
        proofs[i] = solidityProof;
        decryptedDatas[i] = {
            X: decryptProof.publicSignals[0],
            Y: decryptProof.publicSignals[1],
        };
        initDeltas[i] = [(0, utilities_1.ecX2Delta)(babyjub, Y[0]), (0, utilities_1.ecX2Delta)(babyjub, Y[2])];
    }
    await (await stateMachineContract.playerDealCards(gameId, proofs, decryptedDatas, initDeltas)).wait();
}
exports.dealMultiCompressedCard = dealMultiCompressedCard;
//# sourceMappingURL=proof.js.map