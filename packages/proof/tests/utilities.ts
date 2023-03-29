import { assert } from 'chai';
import { elgamalEncrypt, elgamalDecrypt } from "../src/shuffle/plaintext";
import { bits2Num, compressDeck, decompressDeck, ecCompress, ecDecompress, ecX2Delta, num2Bits, sampleFieldElements } from "../src/shuffle/utilities";
const buildBabyjub = require('circomlibjs-0-1-7').buildBabyjub;
const Scalar = require("ffjavascript").Scalar;

type BabyJub = any;

describe('Utility test', function () {
    let babyjub: BabyJub;
    beforeEach(async () => {
        babyjub = await buildBabyjub();
    });

    it('Bit decomposition is correct.', async () => {
        let numElements = 100n;
        let numBits = 254n;
        let elements = sampleFieldElements(babyjub, numBits, numElements);
        for (let i = 0; i < numElements; i++) {
            assert(bits2Num(num2Bits(elements[i], Number(numBits))) === elements[i]);
        }
    })

    it('Elliptic curve compression and decompression are correct.', async () => {
        let numPoints = 100n;
        let points = []
        for (let i = 1; i <= numPoints; i++) {
            points.push(babyjub.mulPointEscalar(babyjub.Base8, i));
        }
        let ecArr: bigint[] = [];
        for (let i = 0; i < numPoints; i++) {
            ecArr.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(points[i][0])));
        }
        for (let i = 0; i < numPoints; i++) {
            ecArr.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(points[i][1])));
        }
        let compression = ecCompress(ecArr);
        let decompressedEcArr = ecDecompress(compression.xArr, compression.deltaArr, compression.selector);
        for (let i = 0; i < ecArr.length; i++) {
            assert(ecArr[i] === decompressedEcArr[i]);
        }
    })

    it('Compressing and decompressing a deck of cards are correct.', async () => {
        let numCards = 100;
        let points = []
        for (let i = 1; i <= 2 * numCards; i++) {
            points.push(babyjub.mulPointEscalar(babyjub.Base8, i));
        }
        let deck: bigint[] = [];
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
        let compression = compressDeck(deck);
        let decompression = decompressDeck(compression.X0, compression.X1, compression.delta0, compression.delta1, compression.selector);
        for (let i = 0; i < 2 * numCards; i++) {
            assert(decompression[i] === deck[i]);
        }
    })

    it('Recovering Delta from x coodinate is correct.', async () => {
        let numPoints = 100n;
        let points = []
        for (let i = 1; i <= numPoints; i++) {
            points.push(babyjub.mulPointEscalar(babyjub.Base8, i));
        }
        let ecArr: bigint[] = [];
        for (let i = 0; i < numPoints; i++) {
            ecArr.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(points[i][0])));
        }
        for (let i = 0; i < numPoints; i++) {
            ecArr.push(Scalar.fromRprLE(babyjub.F.fromMontgomery(points[i][1])));
        }
        let compression = ecCompress(ecArr);
        for (let i = 0; i < compression.xArr.length; i++) {
            assert(ecX2Delta(babyjub, compression.xArr[i]) === compression.deltaArr[i]);
        }
    })

    it('ElGamal Encryption and Decryption are correct.', async () => {
        let sk = 2022n;
        let pk = babyjub.mulPointEscalar(babyjub.Base8, sk);
        let ic0 = babyjub.mulPointEscalar(babyjub.Base8, 0);
        let ic1 = babyjub.mulPointEscalar(babyjub.Base8, 5);
        let r: bigint = 3n;
        let encryption = elgamalEncrypt(babyjub, ic0, ic1, r, pk);
        let decryption = elgamalDecrypt(babyjub, encryption[0], encryption[1], sk);
        assert(babyjub.F.toString(ic1[0]) === babyjub.F.toString(decryption[0]));
        assert(babyjub.F.toString(ic1[1]) === babyjub.F.toString(decryption[1]));
    })
});
