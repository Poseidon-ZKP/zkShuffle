import { Identity } from '@semaphore-protocol/identity';
import { generateSignalHash, Proof, packToSolidityProof, SolidityProof } from '@semaphore-protocol/proof';
const { poseidon, poseidon_gencontract } = require('circomlibjs');
const snarkjs = require('snarkjs');

export { Proof, Identity, packToSolidityProof, SolidityProof, poseidon, poseidon_gencontract };

export declare type FullProof = {
    proof: Proof;
    publicSignals: PublicSignals;
};
export type PublicSignals = {
    rc: string,
    nullifierHash: string,
    signalHash: string,
    externalNullifier: string,
}

export default async function generateProof(
    identity: Identity,
    rand: bigint,
    externalNullifier: string,
    signal: string,
    wasmFile: string,
    zkeyFile: string
): Promise<FullProof> {
    console.log(new Date().toUTCString() + ' generateProof...')
    const { proof, publicSignals }: { proof: any, publicSignals: any } = await snarkjs.groth16.fullProve(
        {
            r: rand,
            identityNullifier: identity.getNullifier(),
            externalNullifier: externalNullifier,
            signalHash: generateSignalHash(signal)
        },
        wasmFile,
        zkeyFile
    )

    const fullProof = {
        proof,
        publicSignals: {
            rc: publicSignals[0],
            nullifierHash: publicSignals[1],
            signalHash: publicSignals[2],
            externalNullifier: publicSignals[3]
        }
    }

    console.log(new Date().toUTCString() + ' fullProof.publicSignals : ', fullProof.publicSignals)
    return fullProof
}
