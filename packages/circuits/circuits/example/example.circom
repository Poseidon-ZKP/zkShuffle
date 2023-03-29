pragma circom 2.0.0;

template Example() {
    signal input x;
    signal input y;
    signal output out;
    out <-- x * y;
    out === x * y;
}

component main {public [x]} = Example();