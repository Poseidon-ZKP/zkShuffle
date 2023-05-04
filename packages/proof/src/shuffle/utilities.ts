import { BigNumber } from "ethers";
const Scalar = require("ffjavascript").Scalar;

// todo
export type BabyJub = any;
export type EC = any;
export type Deck = any;

/// Throws an error if `condition` is not true.
export function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message || "Assertion Failed");
    }
}

/// Samples field elements between 0 ~ min(2**numBits-1, Fr size).
export function sampleFieldElements(
    babyjub: BabyJub,
    numBits: bigint,
    numElements: bigint,
): bigint[] {
    let arr = [];
    let num: bigint;
    const threshold = Scalar.exp(2, numBits);
    for (let i = 0; i < numElements; i++) {
        do {
            num = Scalar.fromRprLE(babyjub.F.random());
        } while (Scalar.geq(num, threshold));
        arr.push(num);
    }
    return arr;
}

/// Compresses an array of boolean into a bigint.
export function bits2Num(arr: boolean[]): bigint {
    let res: bigint = 0n;
    let power = 1n;
    for (let i = 0; i < arr.length; i++) {
        res += BigInt(arr[i]) * power;
        power *= 2n;
    }
    return res;
}

/// Decomposes `num` into a boolean array of bits.
export function num2Bits(num: bigint, length: number): boolean[] {
    let bits: boolean[] = [];
    while (num > 0) {
        let tmp = Boolean(num % 2n);
        bits.push(tmp);
        num = (num - num % 2n) / 2n;
    }
    while (bits.length < length) {
        bits.push(false);
    }
    return bits;
}

// Generates a secret key between 0 ~ min(2**numBits-1, Fr size).
export function keyGen(babyjub: BabyJub, numBits: bigint): { g: EC, sk: bigint, pk: EC } {
    const sk = sampleFieldElements(babyjub, numBits, 1n)[0];
    return { g: babyjub.Base8, sk: sk, pk: babyjub.mulPointEscalar(babyjub.Base8, sk) }
}

/// Aggregates public keys into a single public key.
/// aggregateKey = \sum_{i=0}^n pks[i]
export function keyAggregate(babyJub: BabyJub, pks: EC[]): EC {
    let aggregateKey = [babyJub.F.e("0"), babyJub.F.e("1")];
    for (let i = 0; i < pks.length; i++) {
        aggregateKey = babyJub.addPoint(aggregateKey, pks[i]);
    }
    return aggregateKey;
}

/// Samples a nxn permutation matrix.
export function samplePermutation(n: number): bigint[] {
    let array = [...Array(n).keys()];
    let currentIndex = array.length - 1;
    while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        currentIndex--;
    }
    let matrix = Array(n * n).fill(0);
    for (let i = 0; i < n; i++) {
        matrix[i * n + array[i]] = 1;
    }
    let matrixBigint: bigint[] = [];
    for (let i = 0; i < n * n; i++) {
        matrixBigint[i] = BigInt(matrix[i]);
    }
    return matrixBigint;
}

/// Initializes a deck of `numCards` cards. Each card is represented as 2 elliptic curve
/// points (c0i.x, c0i.y, c1i.x, c1i.y)
/// Layout: [
///     c01.x, ..., c0n.x,
///     c01.y, ..., c0n.y,
///     c11.x, ..., c1n.x,
///     c11.y, ..., c1n.y,
/// ]
export function initDeck(babyjub: BabyJub, numCards: number): bigint[] {
    let cards = []
    for (let i = 1; i <= numCards; i++) {
        cards.push(babyjub.mulPointEscalar(babyjub.Base8, i));
    }
    let deck: bigint[] = [];
    for (let i = 0; i < numCards; i++) {
        deck.push(0n);
    }
    for (let i = 0; i < numCards; i++) {
        deck.push(1n);
    }
    for (let i = 0; i < numCards; i++) {
        deck.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(cards[i][0])));
    }
    for (let i = 0; i < numCards; i++) {
        deck.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(cards[i][1])));
    }
    return deck;
}

/// Searches the deck for a card. If the card is in the deck, returns the card index.
/// If the card is not in the deck, return -1.
export function searchDeck(deck: bigint[], cardX1: bigint, numCards: number): number {
    for (let i = 0; i < numCards; i++) {
        if (deck[2 * numCards + i] === cardX1) {
            return i;
        }
    }
    return -1;
}

/// Converts the type of pks to be string.
export function convertPk(babyjub: BabyJub, pks: EC[]): bigint[][] {
    let arr = []
    for (let i = 0; i < pks.length; i++) {
        let pk: string[] = [];
        pk.push(babyjub.F.toString(pks[i][0]));
        pk.push(babyjub.F.toString(pks[i][1]));
        arr.push(string2Bigint(pk));
    }
    return arr;
}

/// Computes B = A \times X.
export function matrixMultiplication(A: bigint[], X: bigint[], numRows: number, numCols: number): bigint[] {
    assert(A.length === numRows * numCols, "Shape of A should be numRows x numCols");
    assert(X.length === numCols, "Length of X should be numCols");
    let B: bigint[] = [];
    for (let i = 0; i < numRows; i++) {
        let tmp: bigint = 0n;
        for (let j = 0; j < numCols; j++) {
            tmp += A[i * numCols + j] * X[j];
        }
        B.push(tmp);
    }
    return B;
}

/// Compresses an array of elliptic curve points into compressed format.
/// For each ec point (xi,yi), we have compressed format (xi, si) where si is a 1-bit selector.
/// In particular, we can find a delta_i \in {0,1,...,(q-1)/2} given xi and recover
/// yi = s_i * delta_i + (1-s_i) * (q-delta_i).
/// This function compresses an array of ec from format 
///     [x1, x2, ..., xn, y1, y2, ..., yn]
/// to the compressed format
///     [x1, x2, ..., xn, s]
/// s can be bit decomposed into s1, s2, ..., sn.
/// Assumption: the length of input `ecArr` is less than 254; ec is on Baby Jubjub curve.
export function ecCompress(ecArr: bigint[]): { xArr: bigint[], deltaArr: bigint[], selector: bigint } {
    assert(ecArr.length < 254 * 2, "Length of ecArr should be less than 254*2.");
    let q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    let q_minus1_over2 = 10944121435919637611123202872628637544274182200208017171849102093287904247808n;
    let deltaArr: bigint[] = [];
    let selectorArr: boolean[] = [];
    for (let i = ecArr.length / 2; i < ecArr.length; i++) {
        if (ecArr[i] <= q_minus1_over2) {
            selectorArr.push(true);
            deltaArr.push(ecArr[i]);
        } else {
            selectorArr.push(false);
            deltaArr.push(q - ecArr[i]);
        }
    }
    let selector: bigint = bits2Num(selectorArr);
    let xArr: bigint[] = [];
    for (let i = 0; i < ecArr.length / 2; i++) {
        xArr.push(ecArr[i]);
    }
    return { xArr: xArr, deltaArr: deltaArr, selector: selector };
}

/// Decompresses into an array of elliptic curve points from the compressed format `xArr`, `deltaArr`, and `selector`.
export function ecDecompress(xArr: bigint[], deltaArr: bigint[], selector: bigint): bigint[] {
    assert(xArr.length < 254, "Length of xArr should be less than 254");
    assert(xArr.length === deltaArr.length, "Length of xArr should equal to the length of deltaArr");
    let selectorArr: boolean[] = num2Bits(selector, deltaArr.length);
    assert(selectorArr.length === deltaArr.length, "Length mismatch. selectorArr.length: " + String(selectorArr.length) + ", deltaArr.length: " + String(deltaArr.length));
    let q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    let ecArr: bigint[] = [];
    for (let i = 0; i < xArr.length; i++) {
        ecArr.push(xArr[i]);
    }
    for (let i = 0; i < selectorArr.length; i++) {
        let flag = BigInt(selectorArr[i]);
        ecArr.push(flag * deltaArr[i] + (1n - flag) * (q - deltaArr[i]));
    }
    return ecArr;
}

/// Compresses a deck of cards with the following layout:
///     [
///         x00, x01, ..., x0{n-1}, 
///         y00, y01, ..., y0{n-1}, 
///         x10, x11, ..., x1{n-1}, 
///         y10, y11, ..., y1{n-1}, 
///     ]
export function compressDeck(deck: bigint[]): { X0: bigint[], X1: bigint[], delta0: bigint[], delta1: bigint[], selector: bigint[] } {
    let deck0 = deck.slice(0, deck.length / 2);
    let deck1 = deck.slice(deck.length / 2, deck.length);
    let compressedDeck0 = ecCompress(deck0);
    let compressedDeck1 = ecCompress(deck1);
    let s: bigint[] = [];
    s.push(compressedDeck0.selector);
    s.push(compressedDeck1.selector);
    return { X0: compressedDeck0.xArr, X1: compressedDeck1.xArr, delta0: compressedDeck0.deltaArr, delta1: compressedDeck1.deltaArr, selector: s };
}

/// Decompresses a deck of cards.
export function decompressDeck(
    X0: bigint[],
    X1: bigint[],
    Y0_delta: bigint[],
    Y1_delta: bigint[],
    s: bigint[],
): bigint[] {
    let decompressedDeck0 = ecDecompress(X0, Y0_delta, s[0]);
    let decompressedDeck1 = ecDecompress(X1, Y1_delta, s[1]);
    let deck: bigint[] = [];
    for (let i = 0; i < decompressedDeck0.length; i++) {
        deck.push(decompressedDeck0[i]);
    }
    for (let i = 0; i < decompressedDeck1.length; i++) {
        deck.push(decompressedDeck1[i]);
    }
    return deck;
}

/// Prints an array to match circom input format.
export function printArray(arr: bigint[]) {
    let str = "[";
    for (let i = 0; i < arr.length; i++) {
        str += "\"" + String(arr[i]);
        if (i < arr.length - 1) {
            str += "\", ";
        }
    }
    str += "],";
    return str;
}

/// Given x coordinate of a point on baby jubjub curve, returns a delta such that
///     (a * x^2 + delta^2 = 1 + d * x^2 * delta^2) % q
///     0 <= delta <= (q-1)/2
export function ecX2Delta(babyjub: BabyJub, x: bigint): bigint {
    let q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    let q_minus1_over2 = 10944121435919637611123202872628637544274182200208017171849102093287904247808n;
    let xFq = babyjub.F.e(x);
    let a = babyjub.F.e(168700);
    let d = babyjub.F.e(168696);
    let one = babyjub.F.e(1);
    let xSquare = babyjub.F.square(xFq);
    let delta = babyjub.F.sqrt(babyjub.F.div(
        babyjub.F.sub(
            babyjub.F.mul(a, xSquare),
            one,
        ),
        babyjub.F.sub(
            babyjub.F.mul(d, xSquare),
            one,
        ),
    ));
    delta = Scalar.fromRprLE(babyjub.F.fromMontgomery(delta));
    if (delta > q_minus1_over2) {
        delta = q - delta;
    }
    return delta;
}

/// Receovers an array of delta from an array of x-coordinate of points on babyjubjub curve.
export function recoverDeck(babyjub: BabyJub, X0: bigint[], X1: bigint[]): { Delta0: bigint[], Delta1: bigint[] } {
    let Delta0: bigint[] = [];
    let Delta1: bigint[] = [];
    for (let i = 0; i < X0.length; i++) {
        Delta0.push(ecX2Delta(babyjub, X0[i]));
        Delta1.push(ecX2Delta(babyjub, X1[i]));
    }
    return { Delta0: Delta0, Delta1: Delta1 }
}

/// Converts an array of string to an array of bigint.
export function string2Bigint(arr: string[]): bigint[] {
    let output: bigint[] = [];
    for (let i = 0; i < arr.length; i++) {
        output.push(BigInt(arr[i]));
    }
    return output;
}

/// Prepares `x0`, `x1`, `selector0`, and `selector1` queried from contract to the input data for decryption.
export function prepareDecryptData(
    babyjub: BabyJub,
    x0: BigNumber,
    x1: BigNumber,
    selector0: BigNumber,
    selector1: BigNumber,
    numCards: number,
    cardIdx: number,
): bigint[] {
    let Y = []
    let q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    let delta0 = ecX2Delta(babyjub, x0.toBigInt());
    let delta1 = ecX2Delta(babyjub, x1.toBigInt());
    let flag0 = BigInt(num2Bits(selector0.toBigInt(), numCards)[cardIdx]);
    let flag1 = BigInt(num2Bits(selector1.toBigInt(), numCards)[cardIdx]);
    // Y layout: [c0.x, c0.y, c1.x, c1.y]
    Y.push(x0.toBigInt());
    Y.push(flag0 * delta0 + (1n - flag0) * (q - delta0));
    Y.push(x1.toBigInt());
    Y.push(flag1 * delta1 + (1n - flag1) * (q - delta1));
    return Y;
}

// Prepares deck queried from contract to the deck for generating ZK proof.
export function prepareShuffleDeck(
    babyjub: BabyJub,
    deck : Deck,
    numCards: Number,
): { X0: bigint[], X1: bigint[], Selector: bigint[], Delta: bigint[][] } {
    let deckX0: bigint[] = [];
    let deckX1: bigint[] = [];
    console.log("deck.X0 : ", deck.X0)
    for (let i = 0; i < numCards; i++) {
        deckX0.push(deck.X0[i].toBigInt());
    }
    for (let i = 0; i < numCards; i++) {
        deckX1.push(deck.X1[i].toBigInt());
    }
    let deckDelta = recoverDeck(babyjub, deckX0, deckX1);
    return {
        X0: deckX0,
        X1: deckX1,
        Selector: [deck.selector0._data.toBigInt(), deck.selector1._data.toBigInt()],
        Delta: [deckDelta.Delta0, deckDelta.Delta1],
    }
}
