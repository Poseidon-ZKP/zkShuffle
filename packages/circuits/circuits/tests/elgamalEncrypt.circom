pragma circom 2.0.0;

include "../common/elgamal.circom";

template test() {
    signal input ic0[2];
    signal input ic1[2];
    signal input r;     
    signal input pk[2]; 
    signal output c0[2];
    signal output c1[2];
    var base[2] = [5299619240641551281634865583518297030282874472190772894086521144482721001553,
                    16950150798460657717958625567821834550301663161624707787222815936182638968203];
    component encrypt = ElGamalEncrypt(251, base);
    for(var i = 0; i < 2; i++) {
        encrypt.ic0[i] <== ic0[i];
        encrypt.ic1[i] <== ic1[i];
        encrypt.pk[i] <== pk[i];
    }
    encrypt.r <== r;
    for(var i = 0; i < 2; i++) {
        c0[i] <== encrypt.c0[i];
        c1[i] <== encrypt.c1[i];
    }
}

component main {public [ic0, ic1, pk]} = test();
