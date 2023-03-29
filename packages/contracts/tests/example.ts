// @todo: we can't change it to 100% Typescript now because the ffjavascript and circom_tester

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { artifacts, ethers, waffle } from 'hardhat';
import { resolve } from 'path';
import { Example } from '../types';
import { ExampleVerifier } from '../types/@p0x-labs/poseidon-zk-circuits/contracts/example_verifier.sol';
const snarkjs = require('snarkjs');

const resourceBasePath = resolve(__dirname, '../node_modules/@p0x-labs/poseidon-zk-circuits');

describe('Example test', function () {
    let signers: SignerWithAddress[] = [];
    let admin: SignerWithAddress;
    let example: Example;
    let verifier: ExampleVerifier;
    beforeEach( async() => {
        signers = await ethers.getSigners();
        admin = signers[0];
        // deploy contract
        const verifierArtifact = await artifacts.readArtifact('ExampleVerifier');
        verifier = <ExampleVerifier>await waffle.deployContract(admin, verifierArtifact, []);

        const exampleArtifact = await artifacts.readArtifact('Example');
        example =  <Example>await waffle.deployContract(admin, exampleArtifact, [verifier.address]);
    });

    it('Example contract can verify the proof by integrating verifier contract', async () => {
        const wasmFile = resolve(resourceBasePath, './wasm/example.wasm');
        const zkeyFile = resolve(resourceBasePath, './zkey/example.zkey');
        const { proof, publicSignals }: any = await snarkjs.groth16.fullProve({ x: 2, y: 5 }, wasmFile, zkeyFile);
        await example.joinGameWithProof(
            [proof.pi_a[0], proof.pi_a[1]],
            [
                [proof.pi_b[0][1], proof.pi_b[0][0]], 
                [proof.pi_b[1][1], proof.pi_b[1][0]]
            ],
            [proof.pi_c[0], proof.pi_c[1]],
            [publicSignals[0], publicSignals[1]]
        )
        
        await expect(example.joinGameWithProof(
            [proof.pi_a[1], proof.pi_a[1]],
            [
                [proof.pi_b[0][1], proof.pi_b[0][0]], 
                [proof.pi_b[1][1], proof.pi_b[1][0]]
            ],
            [proof.pi_c[0], proof.pi_c[1]],
            [publicSignals[0], publicSignals[1]]
        )).to.be.revertedWith('');
    })
});

