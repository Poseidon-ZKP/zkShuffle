// @todo: we can't change it to 100% Typescript now because the ffjavascript and circom_tester

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { assert } from 'chai';
import { artifacts, ethers, waffle } from 'hardhat';
import { resolve } from 'path';
import { Verifier } from 'types/example_verifier.sol/Verifier';
const snarkjs = require('snarkjs');

const F1Field = require('ffjavascript').F1Field;
const Scalar = require('ffjavascript').Scalar;
const p = Scalar.fromString('21888242871839275222246405745257275088548364400416034343698204186575808495617');
const Fr = new F1Field(p);

const wasm_tester = require('circom_tester').wasm;

async function checkMul(x: number, y: number, circuit: any) {
    const witness = await circuit.calculateWitness({ x, y }, true);
    assert(Fr.eq(Fr.e(witness[1]), Fr.mul(Fr.e(x), Fr.e(y))), 'check Mul failed');
}

describe('Mul test', function () {
    let circuit: any;
    let signers: SignerWithAddress[] = [];
    let admin: SignerWithAddress;
    let verifier: Verifier;
    beforeEach( async() => {
        signers = await ethers.getSigners();
        admin = signers[0];
        circuit = await wasm_tester(resolve(__dirname, '../circuits/example/example.circom'));
        // deploy contract
        const verifierArtifact = await artifacts.readArtifact('ExampleVerifier');
        verifier = <Verifier>await waffle.deployContract(admin, verifierArtifact, []);
    });

    it('Should create a Mul circuit', async () => {
        await circuit.loadConstraints();
        assert.equal(circuit.constraints.length, 1);
    });

    // ======================== circom test
    it('Should pass various mul cases', async () => {
        await checkMul(2, 5, circuit);
        await checkMul(20, 15, circuit);
        await checkMul(3, 15, circuit);
        await checkMul(4, 5, circuit);
    });

    // ====================== verifier contract test
    it('verifier contract can be used to verify the proof', async () => {
        const wasmFile = resolve(__dirname, '../wasm/example.wasm');
        const zkeyFile = resolve(__dirname, '../zkey/example.zkey');
        const { proof, publicSignals }: any = await snarkjs.groth16.fullProve({ x: 2, y: 5 }, wasmFile, zkeyFile);
        await verifier.verifyProof(
            [proof.pi_a[0], proof.pi_a[1]],
            [
                [proof.pi_b[0][1], proof.pi_b[0][0]], 
                [proof.pi_b[1][1], proof.pi_b[1][0]]
            ],
            [proof.pi_c[0], proof.pi_c[1]],
            [publicSignals[0], publicSignals[1]]
        )
    })
});

