import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { readFileSync } from 'fs';
import { ethers } from 'hardhat';
import { resolve } from 'path';
import { PoseidonT3__factory, Group__factory, GroupVerifier__factory } from '../types';
import generateProof, { Group, Identity, packToSolidityProof, poseidon, poseidon_gencontract as poseidonContract, SolidityProof } from '@poseidon-zkp/poseidon-zk-proof/src/group/proof';
const snarkjs = require('snarkjs');

const TREE_DEPTH = 10; // 10 need 43s ,  16 need 10mins, 20need ~ 160mins

const resourceBasePath = resolve(__dirname, '../node_modules/@poseidon-zkp/poseidon-zk-circuits');

describe('Group test', function () {
    let signers: SignerWithAddress[] = [];
    let owner: SignerWithAddress;
    beforeEach(async () => {
        signers = await ethers.getSigners();
        owner = signers[0];
    });

    it('Group contract can function normally', async () => {
        const wasmFilePath = resolve(resourceBasePath, './wasm/group.wasm');
        const zkeyFilePath = resolve(resourceBasePath, './zkey/group.zkey');
        const vKey: any = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(zkeyFilePath))));
        console.log('vKey.protocol : ', vKey.protocol);

        // deploy contract 1/4 : verifier
        const v16 = await (new GroupVerifier__factory(owner)).deploy()
        console.log('v16.address : ', v16.address)
        // deploy contract 2/4 : poseidon(2)
        const poseidonABI = poseidonContract.generateABI(2)
        const poseidonBytecode = poseidonContract.createCode(2)
        const PoseidonLibFactory = new ethers.ContractFactory(poseidonABI, poseidonBytecode, owner)

        const poseidonLib = await PoseidonLibFactory.deploy()
        await poseidonLib.deployed()
        const pt3 = PoseidonT3__factory.connect(poseidonLib.address, owner)
        console.log('pt3.address : ', pt3.address)
        // deploy contract 3/4 : M Tree
        const IncrementalBinaryTreeLibFactory = await ethers.getContractFactory('IncrementalBinaryTree', {
            libraries: {
                PoseidonT3: pt3.address
            }
        })
        const incrementalBinaryTreeLib = await IncrementalBinaryTreeLibFactory.deploy()
        await incrementalBinaryTreeLib.deployed()
        console.log('incrementalBinaryTreeLib.address : ', incrementalBinaryTreeLib.address)

        // deploy contract 4/4 : Semaphore Voting
        const GroupContractFactory = await ethers.getContractFactory('Group', {
            libraries: {
                IncrementalBinaryTree: incrementalBinaryTreeLib.address
            }
        })
        const sc = await (await GroupContractFactory.deploy([
            { contractAddress: v16.address, merkleTreeDepth: TREE_DEPTH }
        ])).deployed()
        const g = Group__factory.connect(sc.address, owner)
        console.log('g.address : ', g.address)

        // 1/3. create group
        const groupId = BigInt(1)
        let coordinator = signers[1]
        let tx = g.createGroup(groupId, TREE_DEPTH, coordinator.address)
        await expect(tx).to.emit(g, 'GroupCreated').withArgs(groupId, TREE_DEPTH, 0)

        // 2/3. add Member
        const identity = new Identity('identity')
        const identityCommitment = identity.generateCommitment()
        tx = g.connect(coordinator).addMember(groupId, identityCommitment)
        await expect(tx).to.emit(g, 'MemberAdded')
            .withArgs(
                groupId,
                0,
                identityCommitment,
                '13306836988436479785626102362873594397500830099933583678006749550837591407705'
            )

        const size = await g.getNumberOfMerkleTreeLeaves(groupId)
        expect(size).to.be.eq(1)

        // 3/3. verify
        const group = new Group(TREE_DEPTH)
        group.addMembers([identityCommitment])

        const rand: bigint = BigNumber.from(123456).toBigInt()
        const rc = poseidon([rand, identity.getNullifier()])

        const fullProof = await generateProof(
            identity,
            group,
            rand,
            wasmFilePath,
            zkeyFilePath
        )
        // off-chain verify proof
        expect(await snarkjs.groth16.verify(
            vKey,
            [
                fullProof.publicSignals.rc,
                fullProof.publicSignals.merkleRoot
            ],
            fullProof.proof
        )).eq(true)

        let solidityProof: SolidityProof = packToSolidityProof(fullProof.proof)

        await g.verifyProof(rc, groupId, solidityProof)
    })
});
