import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { readFileSync } from 'fs';
import { ethers } from 'hardhat';
import { resolve } from 'path';
import generateProof, { Identity, packToSolidityProof, poseidon, SolidityProof } from '@poseidon-zkp/poseidon-zk-proof/src/signal/proof';
import { SignalVerifier__factory, Signal__factory } from '../types';
const snarkjs = require('snarkjs');

const resourceBasePath = resolve(__dirname, '../node_modules/@poseidon-zkp/poseidon-zk-circuits');

describe('Signal test', function () {
    let signers: SignerWithAddress[] = [];
    let owner: SignerWithAddress;
    beforeEach(async () => {
        signers = await ethers.getSigners();
        owner = signers[0];
    });

    it('Signal contract can function normally', async () => {
        const wasmFilePath = resolve(resourceBasePath, './wasm/signal.wasm');
        const zkeyFilePath = resolve(resourceBasePath, './zkey/signal.zkey');
        const vKey: any = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(zkeyFilePath))));
        console.log("vKey.protocol : ", vKey.protocol)

        // deploy contract 1/2 : verifier
        const v = await (new SignalVerifier__factory(owner)).deploy()
        console.log("v.address : ", v.address)

        // deploy contract 2/2 : Signal
        const s = await (new Signal__factory(owner)).deploy(v.address)
        console.log("s.address : ", s.address)

        // signal msg
        const rand: bigint = BigNumber.from(123456).toBigInt()
        const identity = new Identity("initAddVoter")
        const rc = poseidon([rand, identity.getNullifier()])

        const externalNullifier = 1
        const msg = "msg 1"
        const bytes32msg = ethers.utils.formatBytes32String(msg)
        const fullProof: { proof: any, publicSignals: any } = await generateProof(
            identity,
            rand,
            externalNullifier,
            msg,
            wasmFilePath,
            zkeyFilePath
        )

        // off-chain verify proof
        expect(await snarkjs.groth16.verify(
            vKey,
            [
                fullProof.publicSignals.rc,
                fullProof.publicSignals.nullifierHash,
                fullProof.publicSignals.signalHash,
                fullProof.publicSignals.externalNullifier
            ],
            fullProof.proof
        )).eq(true)

        let solidityProof: SolidityProof = packToSolidityProof(fullProof.proof)

        // on-chain verify
        await (await s.signal(
            rc,
            bytes32msg,
            fullProof.publicSignals.nullifierHash,
            externalNullifier,
            solidityProof
        )).wait()
    });
});


