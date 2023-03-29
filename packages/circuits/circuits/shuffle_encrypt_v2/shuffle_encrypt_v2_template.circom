pragma circom 2.0.0;

include "../common/babyjubjub.circom";
include "../common/elgamal.circom";
include "../common/matrix.circom";
include "../common/permutation.circom";
include "../shuffle_encrypt/shuffle_encrypt_template.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";

template ShuffleEncryptV2Template(base, numCards, numBits) {
    assert(numCards <= 253);
    signal input pk[2];                 // group element on inner curve
    signal input UX0[numCards];         // numCards x-coordinates of group elements on inner curve
    signal input UX1[numCards];         // numCards x-coordinates of group elements on inner curve
    signal input VX0[numCards];         // numCards x-coordinates of group elements on inner curve
    signal input VX1[numCards];         // numCards x-coordinates of group elements on inner curve
    signal input UDelta0[numCards];     // numCards base field elements on inner curve
    signal input UDelta1[numCards];     // numCards base field elements on inner curve
    signal input VDelta0[numCards];     // numCards base field elements on inner curve
    signal input VDelta1[numCards];     // numCards base field elements on inner curve
    signal input s_u[2];                // selector of y-coordinates
    signal input s_v[2];                // selector of y-coordinates
    signal input A[numCards*numCards];  // Permutation matrix
    signal input R[numCards];           // numCards scalars as randomness

    component n2b_u0 = Num2Bits(numCards);
    component n2b_u1 = Num2Bits(numCards);
    component n2b_v0 = Num2Bits(numCards);
    component n2b_v1 = Num2Bits(numCards);
    n2b_u0.in <== s_u[0];
    n2b_u1.in <== s_u[1];
    n2b_v0.in <== s_v[0];
    n2b_v1.in <== s_v[1];

    component decompress[4*numCards];
    for (var i = 0; i < numCards; i++) {
        decompress[i] = ecDecompress();
        decompress[i].x <== UX0[i];
        decompress[i].s <== n2b_u0.out[i];
        decompress[i].delta <== UDelta0[i];
    }
    for (var i = 0; i < numCards; i++) {
        decompress[numCards + i] = ecDecompress();
        decompress[numCards + i].x <== UX1[i];
        decompress[numCards + i].s <== n2b_u1.out[i];
        decompress[numCards + i].delta <== UDelta1[i];
    }
    for (var i = 0; i < numCards; i++) {
        decompress[2*numCards + i] = ecDecompress();
        decompress[2*numCards + i].x <== VX0[i];
        decompress[2*numCards + i].s <== n2b_v0.out[i];
        decompress[2*numCards + i].delta <== VDelta0[i];
    }
    for (var i = 0; i < numCards; i++) {
        decompress[3*numCards + i] = ecDecompress();
        decompress[3*numCards + i].x <== VX1[i];
        decompress[3*numCards + i].s <== n2b_v1.out[i];
        decompress[3*numCards + i].delta <== VDelta1[i];
    }

    component shuffleEncryptV1 = ShuffleEncryptTemplate(base, numCards, numBits);
    for(var i = 0; i < numCards*numCards; i++) {
        shuffleEncryptV1.A[i] <== A[i];
    }
    for (var i = 0; i < numCards; i++) {
        shuffleEncryptV1.R[i] <== R[i];
    }
    for (var i = 0; i < 2; i++) {
        shuffleEncryptV1.pk[i] <== pk[i];
    }
    for (var i = 0; i < numCards; i++) {
        shuffleEncryptV1.X[i] <== UX0[i];
    }
    for (var i = 0; i < numCards; i++) {
        shuffleEncryptV1.X[numCards + i] <== decompress[i].y;
    }
    for (var i = 0; i < numCards; i++) {
        shuffleEncryptV1.X[2*numCards+i] <== UX1[i];
    }
    for (var i = 0; i < numCards; i++) {
        shuffleEncryptV1.X[3*numCards + i] <== decompress[numCards+i].y;
    }
    for (var i = 0; i < numCards; i++) {
        shuffleEncryptV1.Y[i] === VX0[i];
    }
    for (var i = 0; i < numCards; i++) {
        shuffleEncryptV1.Y[numCards + i] === decompress[2*numCards + i].y;
    }
    for (var i = 0; i < numCards; i++) {
        shuffleEncryptV1.Y[2*numCards + i] === VX1[i];
    }
    for (var i = 0; i < numCards; i++) {
        shuffleEncryptV1.Y[3*numCards + i] === decompress[3*numCards + i].y;
    }
}
