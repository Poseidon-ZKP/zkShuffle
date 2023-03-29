import { Group } from '@semaphore-protocol/group';
import { Identity } from '@semaphore-protocol/identity';
import { Proof, packToSolidityProof, SolidityProof } from '@semaphore-protocol/proof';
import { MerkleProof } from '@zk-kit/incremental-merkle-tree';
const { poseidon, poseidon_gencontract } = require('circomlibjs');
const snarkjs = require('snarkjs');

export { Proof, Group, Identity, MerkleProof, packToSolidityProof, SolidityProof, poseidon, poseidon_gencontract };

export declare type FullProof = {
    proof: Proof;
    publicSignals: PublicSignals;
};
export declare type PublicSignals = {
    rc: string;
    merkleRoot: string;
};

export default async function generateProof(
    identity: Identity,
    group: Group,
    rand: bigint,
    wasmFile: string,
    zkeyFile: string
): Promise<FullProof> {
    console.log(new Date().toUTCString() + ' generateProof...')
    const commitment = identity.generateCommitment()
    const merkleProof: MerkleProof = group.generateProofOfMembership(group.indexOf(commitment))

    const rc = poseidon([rand, identity.getNullifier()])
    const { proof, publicSignals }: {
        proof: any,
        publicSignals: any
    } = await snarkjs.groth16.fullProve(
        {
            identityTrapdoor: identity.getTrapdoor(),
            identityNullifier: identity.getNullifier(),
            treePathIndices: merkleProof.pathIndices,
            treeSiblings: merkleProof.siblings,
            r: rand
        },
        wasmFile,
        zkeyFile
    )

    const fullProof = {
        proof,
        publicSignals: {
            rc: publicSignals[0],
            merkleRoot: publicSignals[1]
        }
    }

    console.log(new Date().toUTCString() + ' fullProof.publicSignals : ', fullProof.publicSignals)
    return fullProof
}