pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../common/randomize.circom";

template CalculateNullifierHash() {
    signal input externalNullifier;
    signal input identityNullifier;

    signal output out;

    component poseidon = Poseidon(2);

    poseidon.inputs[0] <== externalNullifier;
    poseidon.inputs[1] <== identityNullifier;

    out <== poseidon.out;
}

template Signal() {
    signal input identityNullifier;
    signal input signalHash;
    signal input externalNullifier;
    signal input r;

    signal output rc;
    signal output nullifierHash;

    component randomizeCommitment = RandomizeCommitment(1);
    randomizeCommitment.r <== r;
    randomizeCommitment.witness[0] <== identityNullifier;
    rc <== randomizeCommitment.rc;

    component calculateNullifierHash = CalculateNullifierHash();
    calculateNullifierHash.externalNullifier <== externalNullifier;
    calculateNullifierHash.identityNullifier <== identityNullifier;

    // Dummy square to prevent tampering signalHash.
    signal signalHashSquared;
    signalHashSquared <== signalHash * signalHash;

    nullifierHash <== calculateNullifierHash.out;
}

component main {public [signalHash, externalNullifier]} = Signal();
