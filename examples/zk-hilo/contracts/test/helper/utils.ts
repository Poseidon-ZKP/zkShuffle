import { Proof, packToSolidityProof, SolidityProof } from "@semaphore-protocol/proof";
import { BabyJub, Deck, decompressDeck, ecX2Delta, prepareDecryptData, prepareShuffleDeck } from './utilities';
import { shuffleEncryptV2Plaintext } from './plaintext';
const snarkjs = require('snarkjs');

export { packToSolidityProof, SolidityProof };

type Contract = any;

export declare type FullProof = {
    proof: Proof;
    publicSignals: string[];
};

export async function shuffle(
    babyjub: BabyJub,
    A: bigint[],
    R: bigint[],
    aggregatedPk: bigint[],
    numCards: number,
    gameId: number,
    stateMachineContract: Contract,
    shuffleEncryptV2WasmFile: string,
    shuffleEncryptV2ZkeyFile: string,
) {
    let deck: Deck = await stateMachineContract.queryDeck(gameId);
    let aggregatedPkEC = [babyjub.F.e(aggregatedPk[0]), babyjub.F.e(aggregatedPk[1])];
    let preprocessedDeck = prepareShuffleDeck(babyjub, deck, numCards);
    let plaintext_output = shuffleEncryptV2Plaintext(
        babyjub, numCards, A, R, aggregatedPkEC,
        preprocessedDeck.X0, preprocessedDeck.X1,
        preprocessedDeck.Delta[0], preprocessedDeck.Delta[1],
        preprocessedDeck.Selector,
    );
    console.log("shuffleEncryptV2WasmFile`", shuffleEncryptV2WasmFile)
    let shuffleEncryptV2Output = await generateShuffleEncryptV2Proof(
        aggregatedPk, A, R,
        preprocessedDeck.X0, preprocessedDeck.X1,
        preprocessedDeck.Delta[0], preprocessedDeck.Delta[1],
        preprocessedDeck.Selector,
        plaintext_output.X0, plaintext_output.X1,
        plaintext_output.delta0, plaintext_output.delta1,
        plaintext_output.selector,
        shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile,
    );
    let solidityProof: SolidityProof = packToSolidityProof(shuffleEncryptV2Output.proof);
    return { solidityProof, shuffleEncryptV2Output };
}
// Generates proof for shuffle encrypt v2 circuit.
export async function generateShuffleEncryptV2Proof(
    pk: bigint[],
    A: bigint[],
    R: bigint[],
    UX0: bigint[],
    UX1: bigint[],
    UDelta0: bigint[],
    UDelta1: bigint[],
    s_u: bigint[],
    VX0: bigint[],
    VX1: bigint[],
    VDelta0: bigint[],
    VDelta1: bigint[],
    s_v: bigint[],
    wasmFile: string,
    zkeyFile: string,
): Promise<FullProof> {
    return <FullProof>await snarkjs.groth16.fullProve(
        {
            pk: pk, A: A, R: R,
            UX0: UX0, UX1: UX1, UDelta0: UDelta0, UDelta1: UDelta1,
            VX0: VX0, VX1: VX1, VDelta0: VDelta0, VDelta1: VDelta1,
            s_u: s_u, s_v: s_v,
        },
        wasmFile,
        zkeyFile,
    );
}

// Queries an encrypted card from contract, deals card & generates ZK proof,
// and updates the card on contract.
export async function deal(
    babyjub: BabyJub,
    numCards: number,
    gameId: number,
    cardIdx: number,
    sk: bigint,
    pk: bigint[],
    stateMachineContract: Contract,
    decryptWasmFile: string,
    decryptZkeyFile: string,
    isFirstDecryption: boolean,
): Promise<DecryptProofResult> {
    if (isFirstDecryption) {
        const { solidityProof, decryptProof, initDelta } = await dealCompressedCard(
            babyjub,
            numCards,
            gameId,
            cardIdx,
            sk,
            pk,
            stateMachineContract,
            decryptWasmFile,
            decryptZkeyFile,
        );
        const publicSignals: bigint[] = [];
        return { publicSignals, solidityProof, decryptProof, initDelta };
    } else {
        const { publicSignals, solidityProof, decryptProof, initDelta } = await dealUncompressedCard(
            gameId,
            cardIdx,
            sk,
            pk,
            stateMachineContract,
            decryptWasmFile,
            decryptZkeyFile,
        );
        return { publicSignals, solidityProof, decryptProof, initDelta };
    }
}
// Queries compressed card from contract, generate zkp, and verify on contract.
export async function dealCompressedCard(
    babyjub: BabyJub,
    numCards: number,
    gameId: number,
    cardIdx: number,
    sk: bigint,
    pk: bigint[],
    stateMachineContract: Contract,
    decryptWasmFile: string,
    decryptZkeyFile: string,
) {
    let card = await stateMachineContract.queryCardFromDeck(cardIdx, gameId);
    let Y = prepareDecryptData(
        babyjub,
        card[0],
        card[1],
        card[2],
        card[3],
        Number(numCards),
        cardIdx,
    );
    let decryptProof = await generateDecryptProof(Y, sk, pk, decryptWasmFile, decryptZkeyFile);
    let solidityProof: SolidityProof = packToSolidityProof(decryptProof.proof)
    let initDelta = [ecX2Delta(babyjub, Y[0]), ecX2Delta(babyjub, Y[2])]
    return { decryptProof, solidityProof, initDelta };
}
interface DecryptProofResult {
    publicSignals: bigint[];
    solidityProof: SolidityProof;
    decryptProof: FullProof;
    initDelta: bigint[];
}

// Queries uncompressed card from contract, generate zkp, and verify on contract.
export async function dealUncompressedCard(
    gameId: number,
    cardIdx: number,
    sk: bigint,
    pk: bigint[],
    stateMachineContract: Contract,
    decryptWasmFile: string,
    decryptZkeyFile: string,
): Promise<DecryptProofResult> {
    let card = await stateMachineContract.queryCardInDeal(cardIdx, gameId);
    let decryptProof = await generateDecryptProof(
        [card[0].toBigInt(), card[1].toBigInt(), card[2].toBigInt(), card[3].toBigInt()],
        sk, pk,
        decryptWasmFile, decryptZkeyFile);
    let solidityProof: SolidityProof = packToSolidityProof(decryptProof.proof)
    let initDelta = [BigInt(0), BigInt(0)]
    console.log("decryptProof.publicSignals", decryptProof.publicSignals)

    // publicSignals contain 8 values.
    // 1~2 is the card value, 3~6 is the Y, 7～8 is the personal public key.
    const publicSignals = [BigInt(decryptProof.publicSignals[0]), BigInt(decryptProof.publicSignals[1])]
    return { publicSignals, solidityProof, decryptProof, initDelta };
}

// Generates proof for decryption circuit.
export async function generateDecryptProof(
    Y: bigint[],
    skP: bigint,
    pkP: bigint[],
    wasmFile: string,
    zkeyFile: string,
): Promise<FullProof> {
    return <FullProof>await snarkjs.groth16.fullProve(
        { Y: Y, skP: skP, pkP: pkP },
        wasmFile,
        zkeyFile,
    );
}