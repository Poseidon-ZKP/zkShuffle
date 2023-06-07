import { Proof, packToSolidityProof, SolidityProof } from "@semaphore-protocol/proof";
import { BabyJub } from "./utilities";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
export { packToSolidityProof, SolidityProof };
type Contract = any;
export declare type FullProof = {
    proof: Proof;
    publicSignals: string[];
};
export declare function generateDecryptProof(Y: bigint[], skP: bigint, pkP: bigint[], wasmFile: string, zkeyFile: string): Promise<FullProof>;
export declare function generateShuffleEncryptV2Proof(pk: bigint[], A: bigint[], R: bigint[], UX0: bigint[], UX1: bigint[], UDelta0: bigint[], UDelta1: bigint[], s_u: bigint[], VX0: bigint[], VX1: bigint[], VDelta0: bigint[], VDelta1: bigint[], s_v: bigint[], wasmFile: string, zkeyFile: string): Promise<FullProof>;
export declare function shuffle(babyjub: BabyJub, A: bigint[], R: bigint[], aggregatedPk: bigint[], numCards: number, gameId: number, playerAddr: string, gameContract: SignerWithAddress, stateMachineContract: Contract, shuffleEncryptV2WasmFile: string, shuffleEncryptV2ZkeyFile: string): Promise<void>;
export declare function deal(babyjub: BabyJub, numCards: number, gameId: number, cardIdx: number, curPlayerIdx: number, sk: bigint, pk: bigint[], playerAddr: string, gameContract: SignerWithAddress, stateMachineContract: Contract, decryptWasmFile: string, decryptZkeyFile: string, isFirstDecryption: boolean): Promise<bigint[]>;
export declare function dealCompressedCard(babyjub: BabyJub, numCards: number, gameId: number, cardIdx: number, sk: bigint, pk: bigint[], stateMachineContract: Contract, decryptWasmFile: string, decryptZkeyFile: string): Promise<void>;
export declare function dealUncompressedCard(gameId: number, cardIdx: number, sk: bigint, pk: bigint[], stateMachineContract: Contract, decryptWasmFile: string, decryptZkeyFile: string): Promise<bigint[]>;
export declare function dealMultiCompressedCard(babyjub: BabyJub, numCards: number, gameId: number, cards: number[], sk: bigint, pk: bigint[], stateMachineContract: Contract, decryptWasmFile: string, decryptZkeyFile: string): Promise<void>;
//# sourceMappingURL=proof.d.ts.map