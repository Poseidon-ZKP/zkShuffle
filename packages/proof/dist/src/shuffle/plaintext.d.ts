export type BabyJub = any;
export type EC = any;
export declare function elgamalEncrypt(babyJub: BabyJub, ic0: EC, ic1: EC, r: bigint, pk: EC): EC[];
export declare function elgamalDecrypt(babyJub: BabyJub, c0: EC, c1: EC, sk: bigint): EC;
export declare function shuffleEncryptPlaintext(babyjub: BabyJub, numCards: number, A: bigint[], X: bigint[], R: bigint[], pk: EC): bigint[];
export declare function shuffleEncryptV2Plaintext(babyjub: BabyJub, numCards: number, A: bigint[], R: bigint[], pk: EC, UX0: bigint[], UX1: bigint[], UY0_delta: bigint[], UY1_delta: bigint[], s_u: bigint[]): {
    X0: bigint[];
    X1: bigint[];
    delta0: bigint[];
    delta1: bigint[];
    selector: bigint[];
};
//# sourceMappingURL=plaintext.d.ts.map