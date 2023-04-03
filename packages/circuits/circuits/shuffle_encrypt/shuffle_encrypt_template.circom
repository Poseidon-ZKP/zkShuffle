pragma circom 2.0.0;

include "../common/elgamal.circom";
include "../common/matrix.circom";
include "../common/permutation.circom";

/// X layout:
/// [ic_{0,0}.x, ic_{1,0}.x, ..., ic_{n-1,0}.x,
///  ic_{0,0}.y, ic_{1,0}.y, ..., ic_{n-1,0}.y,
///  ic_{0,1}.x, ic_{1,1}.x, ..., ic_{n-1,1}.x,
///  ic_{0,1}.y, ic_{1,1}.y, ..., ic_{n-1,1}.y,
/// ]
/// Here, the i^th cards is represented as two group elements on inner curve
///  ic_{i,0}.x, ic_{i,0}.y, ic_{i,1}.x, ic_{i,1}.y
template ShuffleEncryptTemplate(base, numCards, numBits) {
    signal input A[numCards*numCards];  // Permutation matrix
    signal input X[4*numCards];         // 2*numCards group elements on inner curve
    signal input R[numCards];           // numCards scalars as randomness
    signal input pk[2];                 // aggregate PK, which is a group element on inner curve
    signal output Y[4*numCards];        // 2*numCards group elements on inner curve. Y shares the same layout as X.
    signal B[4*numCards];
    component permutation = Permutation(numCards);
    for (var i = 0; i < numCards*numCards; i++) {
        permutation.in[i] <== A[i];
    }
    component shuffle[4];
    for (var i = 0; i < 4; i++) {
        shuffle[i] = matrixMultiplication(numCards, numCards);
        for (var j = 0; j < numCards*numCards; j++) {
            shuffle[i].A[j] <== A[j];
        }
        for (var j = 0; j < numCards; j++) {
            shuffle[i].X[j] <== X[i*numCards + j];
        }
        for (var j = 0; j < numCards; j++) {
            B[i*numCards + j] <== shuffle[i].B[j];
        }
    }
    component elgamal[numCards];
    for (var i = 0; i < numCards; i++) {
        elgamal[i] = ElGamalEncrypt(numBits, base);
        elgamal[i].ic0[0] <== B[i];
        elgamal[i].ic0[1] <== B[numCards + i];
        elgamal[i].ic1[0] <== B[2*numCards + i];
        elgamal[i].ic1[1] <== B[3*numCards + i];
        elgamal[i].r <== R[i];
        elgamal[i].pk[0] <== pk[0];
        elgamal[i].pk[1] <== pk[1];
        Y[i] <== elgamal[i].c0[0];
        Y[numCards + i] <== elgamal[i].c0[1];
        Y[2*numCards + i] <== elgamal[i].c1[0];
        Y[3*numCards + i] <== elgamal[i].c1[1];
    }
}
