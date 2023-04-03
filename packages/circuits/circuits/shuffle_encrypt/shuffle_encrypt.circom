pragma circom 2.0.0;

include "../common/elgamal.circom";
include "../common/matrix.circom";
include "../common/permutation.circom";
include "./shuffle_encrypt_template.circom";

template ShuffleEncrypt() {
    var numCards = 52;
    var numBits = 251;
    var base[2] = [5299619240641551281634865583518297030282874472190772894086521144482721001553,
                   16950150798460657717958625567821834550301663161624707787222815936182638968203];
    signal input A[numCards * numCards];
    signal input X[4*numCards];
    signal input R[numCards];
    signal input pk[2];
    signal output Y[4*numCards];
    component shuffle_encrypt = ShuffleEncryptTemplate(base, numCards, numBits);
    for (var i = 0; i<numCards*numCards; i++) {
        shuffle_encrypt.A[i] <== A[i];
    }
    for (var i = 0; i<4*numCards; i++) {
        shuffle_encrypt.X[i] <== X[i];
    }
    for (var i = 0; i<numCards; i++) {
        shuffle_encrypt.R[i] <== R[i];
    }
    shuffle_encrypt.pk[0] <== pk[0];
    shuffle_encrypt.pk[1] <== pk[1];
    for (var i = 0; i<4*numCards; i++) {
        Y[i] <== shuffle_encrypt.Y[i];
    }
}

component main {public [X, pk]}  = ShuffleEncrypt();
