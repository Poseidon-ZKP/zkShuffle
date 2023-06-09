"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareShuffleDeck = exports.prepareDecryptData = exports.string2Bigint = exports.recoverDeck = exports.ecX2Delta = exports.printArray = exports.decompressDeck = exports.compressDeck = exports.ecDecompress = exports.ecCompress = exports.matrixMultiplication = exports.convertPk = exports.searchDeck = exports.initDeck = exports.samplePermutation = exports.keyAggregate = exports.keyGen = exports.num2Bits = exports.bits2Num = exports.sampleFieldElements = exports.assert = void 0;
const Scalar = require("ffjavascript").Scalar;
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion Failed");
    }
}
exports.assert = assert;
function sampleFieldElements(babyjub, numBits, numElements) {
    const arr = [];
    let num;
    const threshold = Scalar.exp(2, numBits);
    for (let i = 0; i < numElements; i++) {
        do {
            num = Scalar.fromRprLE(babyjub.F.random());
        } while (Scalar.geq(num, threshold));
        arr.push(num);
    }
    return arr;
}
exports.sampleFieldElements = sampleFieldElements;
function bits2Num(arr) {
    let res = 0n;
    let power = 1n;
    for (let i = 0; i < arr.length; i++) {
        res += BigInt(arr[i]) * power;
        power *= 2n;
    }
    return res;
}
exports.bits2Num = bits2Num;
function num2Bits(num, length) {
    const bits = [];
    while (num > 0) {
        const tmp = Boolean(num % 2n);
        bits.push(tmp);
        num = (num - (num % 2n)) / 2n;
    }
    while (bits.length < length) {
        bits.push(false);
    }
    return bits;
}
exports.num2Bits = num2Bits;
function keyGen(babyjub, numBits) {
    const sk = sampleFieldElements(babyjub, numBits, 1n)[0];
    return {
        g: babyjub.Base8,
        sk,
        pk: babyjub.mulPointEscalar(babyjub.Base8, sk),
    };
}
exports.keyGen = keyGen;
function keyAggregate(babyJub, pks) {
    let aggregateKey = [babyJub.F.e("0"), babyJub.F.e("1")];
    for (let i = 0; i < pks.length; i++) {
        aggregateKey = babyJub.addPoint(aggregateKey, pks[i]);
    }
    return aggregateKey;
}
exports.keyAggregate = keyAggregate;
function samplePermutation(n) {
    const array = [...Array(n).keys()];
    let currentIndex = array.length - 1;
    while (currentIndex !== 0) {
        const randomIndex = Math.floor(Math.random() * currentIndex);
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        currentIndex--;
    }
    const matrix = Array(n * n).fill(0);
    for (let i = 0; i < n; i++) {
        matrix[i * n + array[i]] = 1;
    }
    const matrixBigint = [];
    for (let i = 0; i < n * n; i++) {
        matrixBigint[i] = BigInt(matrix[i]);
    }
    return matrixBigint;
}
exports.samplePermutation = samplePermutation;
function initDeck(babyjub, numCards) {
    const cards = [];
    for (let i = 1; i <= numCards; i++) {
        cards.push(babyjub.mulPointEscalar(babyjub.Base8, i));
    }
    const deck = [];
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
exports.initDeck = initDeck;
function searchDeck(deck, cardX1, numCards) {
    for (let i = 0; i < numCards; i++) {
        if (deck[2 * numCards + i] === cardX1) {
            return i;
        }
    }
    return -1;
}
exports.searchDeck = searchDeck;
function convertPk(babyjub, pks) {
    const arr = [];
    for (let i = 0; i < pks.length; i++) {
        const pk = [];
        pk.push(babyjub.F.toString(pks[i][0]));
        pk.push(babyjub.F.toString(pks[i][1]));
        arr.push(string2Bigint(pk));
    }
    return arr;
}
exports.convertPk = convertPk;
function matrixMultiplication(A, X, numRows, numCols) {
    assert(A.length === numRows * numCols, "Shape of A should be numRows x numCols");
    assert(X.length === numCols, "Length of X should be numCols");
    const B = [];
    for (let i = 0; i < numRows; i++) {
        let tmp = 0n;
        for (let j = 0; j < numCols; j++) {
            tmp += A[i * numCols + j] * X[j];
        }
        B.push(tmp);
    }
    return B;
}
exports.matrixMultiplication = matrixMultiplication;
function ecCompress(ecArr) {
    assert(ecArr.length < 254 * 2, "Length of ecArr should be less than 254*2.");
    const q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    const q_minus1_over2 = 10944121435919637611123202872628637544274182200208017171849102093287904247808n;
    const deltaArr = [];
    const selectorArr = [];
    for (let i = ecArr.length / 2; i < ecArr.length; i++) {
        if (ecArr[i] <= q_minus1_over2) {
            selectorArr.push(true);
            deltaArr.push(ecArr[i]);
        }
        else {
            selectorArr.push(false);
            deltaArr.push(q - ecArr[i]);
        }
    }
    const selector = bits2Num(selectorArr);
    const xArr = [];
    for (let i = 0; i < ecArr.length / 2; i++) {
        xArr.push(ecArr[i]);
    }
    return { xArr, deltaArr, selector };
}
exports.ecCompress = ecCompress;
function ecDecompress(xArr, deltaArr, selector) {
    assert(xArr.length < 254, "Length of xArr should be less than 254");
    assert(xArr.length === deltaArr.length, "Length of xArr should equal to the length of deltaArr");
    const selectorArr = num2Bits(selector, deltaArr.length);
    assert(selectorArr.length === deltaArr.length, "Length mismatch. selectorArr.length: " +
        String(selectorArr.length) +
        ", deltaArr.length: " +
        String(deltaArr.length));
    const q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    const ecArr = [];
    for (let i = 0; i < xArr.length; i++) {
        ecArr.push(xArr[i]);
    }
    for (let i = 0; i < selectorArr.length; i++) {
        const flag = BigInt(selectorArr[i]);
        ecArr.push(flag * deltaArr[i] + (1n - flag) * (q - deltaArr[i]));
    }
    return ecArr;
}
exports.ecDecompress = ecDecompress;
function compressDeck(deck) {
    const deck0 = deck.slice(0, deck.length / 2);
    const deck1 = deck.slice(deck.length / 2, deck.length);
    const compressedDeck0 = ecCompress(deck0);
    const compressedDeck1 = ecCompress(deck1);
    const s = [];
    s.push(compressedDeck0.selector);
    s.push(compressedDeck1.selector);
    return {
        X0: compressedDeck0.xArr,
        X1: compressedDeck1.xArr,
        delta0: compressedDeck0.deltaArr,
        delta1: compressedDeck1.deltaArr,
        selector: s,
    };
}
exports.compressDeck = compressDeck;
function decompressDeck(X0, X1, Y0_delta, Y1_delta, s) {
    const decompressedDeck0 = ecDecompress(X0, Y0_delta, s[0]);
    const decompressedDeck1 = ecDecompress(X1, Y1_delta, s[1]);
    const deck = [];
    for (let i = 0; i < decompressedDeck0.length; i++) {
        deck.push(decompressedDeck0[i]);
    }
    for (let i = 0; i < decompressedDeck1.length; i++) {
        deck.push(decompressedDeck1[i]);
    }
    return deck;
}
exports.decompressDeck = decompressDeck;
function printArray(arr) {
    let str = "[";
    for (let i = 0; i < arr.length; i++) {
        str += '"' + String(arr[i]);
        if (i < arr.length - 1) {
            str += '", ';
        }
    }
    str += "],";
    return str;
}
exports.printArray = printArray;
function ecX2Delta(babyjub, x) {
    const q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    const q_minus1_over2 = 10944121435919637611123202872628637544274182200208017171849102093287904247808n;
    const xFq = babyjub.F.e(x);
    const a = babyjub.F.e(168700);
    const d = babyjub.F.e(168696);
    const one = babyjub.F.e(1);
    const xSquare = babyjub.F.square(xFq);
    let delta = babyjub.F.sqrt(babyjub.F.div(babyjub.F.sub(babyjub.F.mul(a, xSquare), one), babyjub.F.sub(babyjub.F.mul(d, xSquare), one)));
    delta = Scalar.fromRprLE(babyjub.F.fromMontgomery(delta));
    if (delta > q_minus1_over2) {
        delta = q - delta;
    }
    return delta;
}
exports.ecX2Delta = ecX2Delta;
function recoverDeck(babyjub, X0, X1) {
    const Delta0 = [];
    const Delta1 = [];
    for (let i = 0; i < X0.length; i++) {
        Delta0.push(ecX2Delta(babyjub, X0[i]));
        Delta1.push(ecX2Delta(babyjub, X1[i]));
    }
    return { Delta0, Delta1 };
}
exports.recoverDeck = recoverDeck;
function string2Bigint(arr) {
    const output = [];
    for (let i = 0; i < arr.length; i++) {
        output.push(BigInt(arr[i]));
    }
    return output;
}
exports.string2Bigint = string2Bigint;
function prepareDecryptData(babyjub, x0, x1, selector0, selector1, numCards, cardIdx) {
    const Y = [];
    const q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    const delta0 = ecX2Delta(babyjub, x0.toBigInt());
    const delta1 = ecX2Delta(babyjub, x1.toBigInt());
    const flag0 = BigInt(num2Bits(selector0.toBigInt(), numCards)[cardIdx]);
    const flag1 = BigInt(num2Bits(selector1.toBigInt(), numCards)[cardIdx]);
    Y.push(x0.toBigInt());
    Y.push(flag0 * delta0 + (1n - flag0) * (q - delta0));
    Y.push(x1.toBigInt());
    Y.push(flag1 * delta1 + (1n - flag1) * (q - delta1));
    return Y;
}
exports.prepareDecryptData = prepareDecryptData;
function prepareShuffleDeck(babyjub, deck, numCards) {
    const deckX0 = [];
    const deckX1 = [];
    for (let i = 0; i < numCards; i++) {
        deckX0.push(deck.X0[i].toBigInt());
    }
    for (let i = 0; i < numCards; i++) {
        deckX1.push(deck.X1[i].toBigInt());
    }
    const deckDelta = recoverDeck(babyjub, deckX0, deckX1);
    return {
        X0: deckX0,
        X1: deckX1,
        Selector: [deck.selector0._data.toBigInt(), deck.selector1._data.toBigInt()],
        Delta: [deckDelta.Delta0, deckDelta.Delta1],
    };
}
exports.prepareShuffleDeck = prepareShuffleDeck;
//# sourceMappingURL=utilities.js.map