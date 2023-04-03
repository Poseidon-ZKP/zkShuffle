pragma circom 2.0.0;

include "../common/babyjubjub.circom";

component main {public [x, s]} = ecDecompress();
