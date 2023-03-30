
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import { resolve } from 'path';
import generateSignalProof, { Identity, packToSolidityProof, poseidon, poseidon_gencontract as poseidonContract, SolidityProof } from '@p0x-labs/poseidon-zk-proof/src/signal/proof';
import generateGroupProof, { Group } from '@p0x-labs/poseidon-zk-proof/src/group/proof';

import { GroupVerifier__factory, Group__factory, PoseidonT3__factory, SignalVerifier__factory, Signal__factory, Vote__factory } from '../types';
import { exit } from 'process';
const fs = require('fs');
const path = require('path');
const https = require('https')

const resourceBasePath = resolve(__dirname, './');
const URL = "https://p0x-labs.s3.amazonaws.com/refactor/"
const WASM_DIR = resolve(__dirname, './wasm')
const ZKEY_DIR = resolve(__dirname, './zkey')
fs.mkdir(WASM_DIR, () => {})
fs.mkdir(ZKEY_DIR, () => {})

const WASM_SIGNAL = 'wasm/signal.wasm'
const WASM_GROUP = 'wasm/group.wasm'
const ZKEY_SIGNAL = 'zkey/signal.zkey'
const ZKEY_GROUP = 'zkey/group.zkey'

const TREE_DEPTH = 10;

async function dnld_aws(file_name : string) {
    return new Promise((reslv, reject) => {
        if (!fs.existsSync(resolve(__dirname, file_name))) {
            const file = fs.createWriteStream(resolve(__dirname, file_name))
            https.get(URL + file_name, (resp) => {
                file.on("finish", () => {
                    file.close();
                    reslv(0)
                });
                resp.pipe(file)
            });
        }
    });
}

describe('Vote test', function () {
    let signers: SignerWithAddress[] = [];
    let owner: SignerWithAddress;

    beforeEach(async () => {
        signers = await ethers.getSigners();
        owner = signers[0];

        await Promise.all([WASM_SIGNAL, WASM_GROUP, ZKEY_SIGNAL, ZKEY_GROUP].map(
            async (e) => {
                await dnld_aws(e)
            }
        ));
    });

    it('Vote contract can function normally', async () => {
            // deploy contract 1/7 : group verifier
            const group_verifier = await (new GroupVerifier__factory(owner)).deploy()
            console.log("group_verifier.address : " , group_verifier.address)
            // deploy contract 2/7 : poseidon(2)
            const NINPUT = 2
            const poseidonABI = poseidonContract.generateABI(NINPUT)
            const poseidonBytecode = poseidonContract.createCode(NINPUT)
            const PoseidonLibFactory = new ethers.ContractFactory(poseidonABI, poseidonBytecode, owner)
            const poseidonLib = await PoseidonLibFactory.deploy()
            await poseidonLib.deployed()
            const pt3 = PoseidonT3__factory.connect(poseidonLib.address, owner)
            console.log("pt3.address : " , pt3.address)
            // deploy contract 3/7 : M Tree
            const IncrementalBinaryTreeLibFactory = await ethers.getContractFactory("IncrementalBinaryTree", {
                libraries: {
                    PoseidonT3: pt3.address
                }
            })
            const incrementalBinaryTreeLib = await IncrementalBinaryTreeLibFactory.deploy()
            await incrementalBinaryTreeLib.deployed()
            console.log("incrementalBinaryTreeLib.address : " , incrementalBinaryTreeLib.address)
            // deploy contract 4/4 : group
            const ContractFactory = await ethers.getContractFactory("Group", {
                libraries: {
                    IncrementalBinaryTree: incrementalBinaryTreeLib.address
                }
            })
            const gc = await (await ContractFactory.deploy([
                 { contractAddress : group_verifier.address, merkleTreeDepth : TREE_DEPTH }
            ])).deployed()
            const g = Group__factory.connect(gc.address, owner)
            console.log("g.address : " , g.address)
            // deploy contract 1/2 : signal verifier
            const signal_verifier = await (new SignalVerifier__factory(owner)).deploy()
            console.log("signal_verifier.address : " , signal_verifier.address)
        
            // deploy contract 2/2 : Signal
            const s = await (new Signal__factory(owner)).deploy(signal_verifier.address)
            console.log("signal.address : " , s.address)
        
            // deploy contract  : Vote
            const v = await (new Vote__factory(owner)).deploy(g.address, s.address)
            console.log("vote.address : " , v.address)

            // 1/3. create group
            await (await (v.createGroup(TREE_DEPTH, owner.address))).wait()
            const groupId = await v.GROUP_ID()
        
            // 2/3. add Member
            const identity = new Identity("identity")
            const identityCommitment = identity.generateCommitment()
            await (await (v.addMember(groupId, identityCommitment))).wait()
        
            // 3/3. generate witness, prove, verify
            const group = new Group(TREE_DEPTH)
            group.addMembers([identityCommitment])
        
            // same r/rc
            const rand : bigint = BigNumber.from(123456).toBigInt()
            const rc = poseidon([rand, identity.getNullifier()])
            const groupProof =  await generateGroupProof(
                identity,
                group,
                rand,
                resolve(resourceBasePath, './wasm/group.wasm'),
                resolve(resourceBasePath, './zkey/group.zkey'),
            )
            // console.log("groupProof : ", groupProof)
        
            let solidityGroupProof: SolidityProof = packToSolidityProof(groupProof.proof)
            const externalNullifier = 1
            const msg = "msg 1"
            const bytes32msg = ethers.utils.formatBytes32String(msg)
            const signalProof =  await generateSignalProof(
                identity,
                rand,
                externalNullifier,
                msg,
                resolve(resourceBasePath, './wasm/signal.wasm'),
                resolve(resourceBasePath, './zkey/signal.zkey')
            )
            let soliditySignalProof: SolidityProof = packToSolidityProof(signalProof.proof)
            await (await v.vote(
                rc, groupId, solidityGroupProof,
                bytes32msg,
                signalProof.publicSignals.nullifierHash,
                externalNullifier,
                soliditySignalProof
            )).wait()
        
            console.log("Voting Done!!!")
    });
});
