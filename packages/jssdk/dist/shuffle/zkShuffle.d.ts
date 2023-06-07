import { Contract, Signer } from "ethers";
export type BabyJub = any;
export type EC = any;
export type Deck = any;
export type FileType = ArrayBuffer | string;
export declare enum BaseState {
    Uncreated = 0,
    Created = 1,
    Registration = 2,
    Shuffle = 3,
    Deal = 4,
    Open = 5,
    GameError = 6,
    Complete = 7
}
export declare enum GameTurn {
    NOP = 0,
    Shuffle = 1,
    Deal = 2,
    Open = 3,
    Complete = 4,
    Error = 5
}
interface IZKShuffle {
    joinGame: (gameId: number) => Promise<number>;
    checkTurn: (gameId: number, startBlock: number) => Promise<GameTurn>;
    shuffle: (gameId: number) => Promise<boolean>;
    draw: (gameId: number) => Promise<boolean>;
    open: (gameId: number, cardIds: number[]) => Promise<number[]>;
    openOffchain: (gameId: number, cardIds: number[]) => Promise<number[]>;
    getPlayerId: (gameId: number) => Promise<number>;
    queryCards: (gameId: number, cardIds: number[]) => Promise<number[]>;
}
export declare class ZKShuffle implements IZKShuffle {
    babyjub: any;
    smc: Contract;
    signer: Signer;
    pk: EC;
    sk: bigint | undefined;
    encrypt_wasm: FileType | undefined;
    encrypt_zkey: FileType | undefined;
    decrypt_wasm: FileType | undefined;
    decrypt_zkey: FileType | undefined;
    nextBlockPerGame: Map<number, number>;
    private constructor();
    static create: (shuffleManagerContract: string, signer: Signer, seed: bigint, decrypt_wasm?: FileType, decrypt_zkey?: FileType, encrypt_wasm?: FileType, encrypt_zkey?: FileType) => Promise<ZKShuffle>;
    private init;
    static generateShuffleSecret(): Promise<bigint>;
    joinGame(gameId: number): Promise<number>;
    getPlayerId(gameId: number): Promise<number>;
    checkTurn(gameId: number, startBlock?: any): Promise<GameTurn>;
    generate_shuffle_proof(gameId: number): Promise<import("@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/proof").FullProof>;
    private _shuffle;
    shuffle(gameId: number): Promise<boolean>;
    decrypt(gameId: number, cards: number[]): Promise<void>;
    private getSetBitsPositions;
    draw(gameId: number): Promise<boolean>;
    getOpenProof(gameId: number, cardIds: number[]): Promise<{
        cardMap: number;
        decryptedCards: Record<string, any>;
        proofs: Record<string, any>;
    }>;
    private queryCardsPerX;
    openOffchain(gameId: number, cardIds: number[]): Promise<number[]>;
    queryCards(gameId: number, cardIds: number[]): Promise<number[]>;
    open(gameId: number, cardIds: number[]): Promise<number[]>;
}
export {};
//# sourceMappingURL=zkShuffle.d.ts.map