import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { assert, ecCompress } from '@p0x-labs/poseidon-zk-proof/src/shuffle/utilities';
import { elgamalDecrypt, elgamalEncrypt } from '@p0x-labs/poseidon-zk-proof/src/shuffle/plaintext';
import { ethers } from 'hardhat';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { build_circuit } from '../utils/utils';
const buildBabyjub = require('circomlibjs').buildBabyjub;
const snarkjs = require('snarkjs');
const Scalar = require("ffjavascript").Scalar;

// Compiles utility circuits for the test purpose.
async function compile_utility_circuits() {
    const circuit_list = ["babyjubjub", "elgamalDecrypt", "elgamalEncrypt", "matrix"];
    for (let i = 0; i < circuit_list.length; i++) {
        console.log("Building " + circuit_list[i] + " circuit");
        await build_circuit("circuits/tests", circuit_list[i]);
    }
}

describe('Utility circuit unit tests', function () {

    before(async function () {
        const signers: SignerWithAddress[] = await ethers.getSigners();
        const admin = signers[0];
        this.signers = signers;
        this.admin = admin;
        await compile_utility_circuits();
    });

    it('Elliptic curve decompression on baby jubjub curve is correct', async function () {
        let babyjub = await buildBabyjub();
        const wasmFile = resolve(__dirname, '../wasm/babyjubjub.wasm');
        const zkeyFile = resolve(__dirname, '../zkey/babyjubjub.zkey');
        const vkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(zkeyFile))));
        let ecPoint = babyjub.mulPointEscalar(babyjub.Base8, 5);
        let compressedPoint = ecCompress([
            Scalar.fromRprLE(babyjub.F.fromMontgomery(ecPoint[0])),
            Scalar.fromRprLE(babyjub.F.fromMontgomery(ecPoint[1])),
        ]);
        let proveOutput = await snarkjs.groth16.fullProve(
            { x: compressedPoint.xArr[0], delta: compressedPoint.deltaArr[0], s: compressedPoint.selector },
            wasmFile,
            zkeyFile
        );
        assert(await snarkjs.groth16.verify(vkey, proveOutput.publicSignals, proveOutput.proof), 'Off-chain verification failed.');
    });

    it('ElGamal Encryption and Decryption are correct', async function () {
        let babyjub = await buildBabyjub();
        const encryptionWasmFile = resolve(__dirname, '../wasm/elgamalEncrypt.wasm');
        const encryptionZkeyFile = resolve(__dirname, '../zkey/elgamalEncrypt.zkey');
        const encryptionVkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(encryptionZkeyFile))));

        const decryptionWasmFile = resolve(__dirname, '../wasm/elgamalDecrypt.wasm');
        const decryptionZkeyFile = resolve(__dirname, '../zkey/elgamalDecrypt.zkey');
        const decryptionVkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(decryptionZkeyFile))));

        let ic0 = babyjub.mulPointEscalar(babyjub.Base8, 0);
        let ic1 = babyjub.mulPointEscalar(babyjub.Base8, 8);
        let sk = 5n;
        let pk = babyjub.mulPointEscalar(babyjub.Base8, sk);
        let r = 86n;
        let encryption = elgamalEncrypt(babyjub, ic0, ic1, r, pk);
        let c0 = encryption[0];
        let c1 = encryption[1];
        let decryption = elgamalDecrypt(babyjub, c0, c1, sk);
        assert(babyjub.F.toString(decryption[0]) === babyjub.F.toString(ic1[0]), "Decryption failed.");
        assert(babyjub.F.toString(decryption[1]) === babyjub.F.toString(ic1[1]), "Decryption failed.");

        let encryptionProveOutput = await snarkjs.groth16.fullProve(
            {
                ic0: [
                    babyjub.F.toString(ic0[0]),
                    babyjub.F.toString(ic0[1]),
                ],
                ic1: [
                    babyjub.F.toString(ic1[0]),
                    babyjub.F.toString(ic1[1]),
                ],
                pk: [
                    babyjub.F.toString(pk[0]),
                    babyjub.F.toString(pk[1]),
                ],
                r: r,
            },
            encryptionWasmFile,
            encryptionZkeyFile
        );
        assert(await snarkjs.groth16.verify(encryptionVkey, encryptionProveOutput.publicSignals, encryptionProveOutput.proof), 'Off-chain verification failed.');

        let decryptionProveOutput = await snarkjs.groth16.fullProve(
            {
                c0: [
                    babyjub.F.toString(c0[0]),
                    babyjub.F.toString(c0[1]),
                ],
                c1: [
                    babyjub.F.toString(c1[0]),
                    babyjub.F.toString(c1[1]),
                ],
                sk: sk,
            },
            decryptionWasmFile,
            decryptionZkeyFile
        );
        assert(await snarkjs.groth16.verify(decryptionVkey, decryptionProveOutput.publicSignals, decryptionProveOutput.proof), 'Off-chain verification failed.');
    });

    it('Matrix Multiplication is correct', async function () {
        const wasmFile = resolve(__dirname, '../wasm/matrix.wasm');
        const zkeyFile = resolve(__dirname, '../zkey/matrix.zkey');
        const vkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(zkeyFile))));
        let proveOutput = await snarkjs.groth16.fullProve(
            { A: [10, 11, 3, 999, 12312412, 0], X: [5, 3, 4] },
            wasmFile,
            zkeyFile
        );
        assert(await snarkjs.groth16.verify(vkey, proveOutput.publicSignals, proveOutput.proof), 'Off-chain verification failed.');
    });
});
