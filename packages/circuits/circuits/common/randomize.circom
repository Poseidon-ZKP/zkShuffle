pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

template RandomizeCommitment(nWitness) {
    signal input r;
    signal input witness[nWitness];
    signal output rc;

    component poseidon = Poseidon(nWitness + 1);
    poseidon.inputs[0] <== r;
    for (var i = 0; i < nWitness; i++) {
        poseidon.inputs[i + 1] <== witness[i];
    }

    rc <== poseidon.out;
}
