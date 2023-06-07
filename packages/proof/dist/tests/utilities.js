"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const plaintext_1 = require("../src/shuffle/plaintext");
const utilities_1 = require("../src/shuffle/utilities");
const buildBabyjub = require('circomlibjs-0-1-7').buildBabyjub;
const Scalar = require("ffjavascript").Scalar;
describe('Utility test', function () {
    let babyjub;
    beforeEach(async () => {
        babyjub = await buildBabyjub();
    });
    it('Bit decomposition is correct.', async () => {
        let numElements = 100n;
        let numBits = 254n;
        let elements = (0, utilities_1.sampleFieldElements)(babyjub, numBits, numElements);
        for (let i = 0; i < numElements; i++) {
            (0, chai_1.assert)((0, utilities_1.bits2Num)((0, utilities_1.num2Bits)(elements[i], Number(numBits))) === elements[i]);
        }
    });
    it('Elliptic curve compression and decompression are correct.', async () => {
        let numPoints = 100n;
        let points = [];
        for (let i = 1; i <= numPoints; i++) {
            points.push(babyjub.mulPointEscalar(babyjub.Base8, i));
        }
        let ecArr = [];
        for (let i = 0; i < numPoints; i++) {
            ecArr.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(points[i][0])));
        }
        for (let i = 0; i < numPoints; i++) {
            ecArr.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(points[i][1])));
        }
        let compression = (0, utilities_1.ecCompress)(ecArr);
        let decompressedEcArr = (0, utilities_1.ecDecompress)(compression.xArr, compression.deltaArr, compression.selector);
        for (let i = 0; i < ecArr.length; i++) {
            (0, chai_1.assert)(ecArr[i] === decompressedEcArr[i]);
        }
    });
    it('Compressing and decompressing a deck of cards are correct.', async () => {
        let numCards = 100;
        let points = [];
        for (let i = 1; i <= 2 * numCards; i++) {
            points.push(babyjub.mulPointEscalar(babyjub.Base8, i));
        }
        let deck = [];
        for (let i = 0; i < numCards; i++) {
            deck.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(points[i][0])));
        }
        for (let i = 0; i < numCards; i++) {
            deck.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(points[i][1])));
        }
        for (let i = numCards; i < 2 * numCards; i++) {
            deck.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(points[i][0])));
        }
        for (let i = numCards; i < 2 * numCards; i++) {
            deck.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(points[i][1])));
        }
        let compression = (0, utilities_1.compressDeck)(deck);
        let decompression = (0, utilities_1.decompressDeck)(compression.X0, compression.X1, compression.delta0, compression.delta1, compression.selector);
        for (let i = 0; i < 2 * numCards; i++) {
            (0, chai_1.assert)(decompression[i] === deck[i]);
        }
    });
    it('Recovering Delta from x coodinate is correct.', async () => {
        let numPoints = 100n;
        let points = [];
        for (let i = 1; i <= numPoints; i++) {
            points.push(babyjub.mulPointEscalar(babyjub.Base8, i));
        }
        let ecArr = [];
        for (let i = 0; i < numPoints; i++) {
            ecArr.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(points[i][0])));
        }
        for (let i = 0; i < numPoints; i++) {
            ecArr.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(points[i][1])));
        }
        let compression = (0, utilities_1.ecCompress)(ecArr);
        for (let i = 0; i < compression.xArr.length; i++) {
            (0, chai_1.assert)((0, utilities_1.ecX2Delta)(babyjub, compression.xArr[i]) === compression.deltaArr[i]);
        }
    });
    it('ElGamal Encryption and Decryption are correct.', async () => {
        let sk = 2022n;
        let pk = babyjub.mulPointEscalar(babyjub.Base8, sk);
        let ic0 = babyjub.mulPointEscalar(babyjub.Base8, 0);
        let ic1 = babyjub.mulPointEscalar(babyjub.Base8, 5);
        let r = 3n;
        let encryption = (0, plaintext_1.elgamalEncrypt)(babyjub, ic0, ic1, r, pk);
        let decryption = (0, plaintext_1.elgamalDecrypt)(babyjub, encryption[0], encryption[1], sk);
        (0, chai_1.assert)(babyjub.F.toString(ic1[0]) === babyjub.F.toString(decryption[0]));
        (0, chai_1.assert)(babyjub.F.toString(ic1[1]) === babyjub.F.toString(decryption[1]));
    });
});
//# sourceMappingURL=utilities.js.map