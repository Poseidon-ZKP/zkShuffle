import { Proof, packToSolidityProof, SolidityProof } from "@semaphore-protocol/proof";
import { BabyJub, Deck, ecX2Delta, prepareDecryptData, prepareShuffleDeck } from './utilities';
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
