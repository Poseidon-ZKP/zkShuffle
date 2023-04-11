import { ethers } from "hardhat";
import { expect } from "chai";
import { keyGen, convertPk, sampleFieldElements, samplePermutation } from "./helper/utilities";
import { shuffle as shuffleDeck } from "./helper/utils";
import { BigNumber } from 'ethers';
const fs = require('fs');
import { resolve } from 'path';
import { exit } from "process";
const https = require('https')
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BabyJub, Deck, ecX2Delta, prepareDecryptData, prepareShuffleDeck } from './helper/utilities';
import { shuffleEncryptV2Plaintext } from './helper/plaintext';
const snarkjs = require('snarkjs');
import { Proof, packToSolidityProof, SolidityProof } from "@semaphore-protocol/proof";

const buildBabyjub = require('circomlibjs').buildBabyjub;
const HOME_DIR = require('os').homedir();
const P0X_DIR = resolve(HOME_DIR, "./.poseidon-zkp")
const resourceBasePath = P0X_DIR;
const P0X_AWS_URL = "https://p0x-labs.s3.amazonaws.com/refactor/"
async function dnld_aws(file_name: string) {
  fs.mkdir(P0X_DIR, () => { })
  fs.mkdir(resolve(P0X_DIR, './wasm'), () => { })
  fs.mkdir(resolve(P0X_DIR, './zkey'), () => { })
  return new Promise((reslv, reject) => {
    if (!fs.existsSync(resolve(P0X_DIR, file_name))) {
      const file = fs.createWriteStream(resolve(P0X_DIR, file_name))
      https.get(P0X_AWS_URL + file_name, (resp) => {
        file.on("finish", () => {
          file.close();
          reslv(0)
        });
        resp.pipe(file)
      });
    } else {
      reslv(0)
    }
  });
}
export declare type FullProof = {
  proof: Proof;
  publicSignals: string[];
};

// Generates proof for shuffle encrypt v2 circuit.
export async function generateShuffleEncryptV2Proof(
  pk: bigint[],
  A: bigint[],
  R: bigint[],
  UX0: bigint[],
  UX1: bigint[],
  UDelta0: bigint[],
  UDelta1: bigint[],
  s_u: bigint[],
  VX0: bigint[],
  VX1: bigint[],
  VDelta0: bigint[],
  VDelta1: bigint[],
  s_v: bigint[],
  wasmFile: string,
  zkeyFile: string,
): Promise<FullProof> {
  return <FullProof>await snarkjs.groth16.fullProve(
    {
      pk: pk, A: A, R: R,
      UX0: UX0, UX1: UX1, UDelta0: UDelta0, UDelta1: UDelta1,
      VX0: VX0, VX1: VX1, VDelta0: VDelta0, VDelta1: VDelta1,
      s_u: s_u, s_v: s_v,
    },
    wasmFile,
    zkeyFile,
  );
}
// Depploys contract for decryption.
async function deployDecrypt() {
  return await (await ethers.getContractFactory('DecryptVerifier')).deploy();
}

// Deploys contract for shuffle encrypt v2.
async function deployShuffleEncryptV2() {
  const vk = await (await ethers.getContractFactory('ShuffleEncryptV2VerifierKey')).deploy();
  return await (await ethers.getContractFactory('Shuffle_encrypt_v2Verifier', {
    libraries: {
      ShuffleEncryptV2VerifierKey: vk.address,
    }
  })).deploy();
}

// Deploys contract for shuffle state machine.
async function deployStateMachine(shuffleStateMachineOwner: SignerWithAddress) {
  const shuffle_encrypt_v2_verifier_contract = await deployShuffleEncryptV2();
  const decrypt_verifier_contract = await deployDecrypt();
  return await (await ethers.getContractFactory('Shuffle')).connect(shuffleStateMachineOwner).deploy(
    shuffle_encrypt_v2_verifier_contract.address,
    decrypt_verifier_contract.address,
  );
}


describe("HiLo", () => {

  let hiLo;
  let shuffle;
  let accounts;
  let pkArray: any = [];
  let skArray: any = [];
  let babyjub;

  const numCards = BigInt(52);
  const numBits = BigInt(251);

  beforeEach(async () => {
    await Promise.all(['wasm/shuffle_encrypt.wasm', 'wasm/decrypt.wasm', 'zkey/shuffle_encrypt.zkey', 'zkey/decrypt.zkey', 'wasm/shuffle_encrypt_v2.wasm', 'zkey/shuffle_encrypt_v2.zkey'].map(
      async (e) => {
        console.log("Downloading")
        await dnld_aws(e)
      }
    ));
    // exit(0);
    pkArray = [];
    skArray = [];
    accounts = await ethers.getSigners();
    shuffle = await deployStateMachine(accounts[0]);
    const HiLo = await ethers.getContractFactory("HiLo");
    hiLo = await HiLo.deploy(shuffle.address);
    await hiLo.deployed();
    const numPlayers = 2;
    const keys: any = [];
    babyjub = await buildBabyjub();
    for (let i = 0; i < numPlayers; i++) {
      keys.push(keyGen(babyjub, numBits));
      pkArray.push(keys[i].pk);
      skArray.push(keys[i].sk);
    }
    pkArray = convertPk(babyjub, pkArray);

  });

  describe("createGame()", function () {
    it("should allow users to create a game", async function () {
      await shuffle.setGameContract(hiLo.address)
      const user1 = hiLo.connect(accounts[1]);
      const createGameTx = await user1.createGame([pkArray[0][0], pkArray[0][1]]);
      const createGameEvent = await createGameTx.wait().then((receipt) => {
        return receipt.events[0].args;
      });
      expect(createGameEvent[0]).to.equal(BigNumber.from(1));
      expect(createGameEvent[1]).to.equal(0);
      expect(createGameEvent[2]).to.equal(accounts[1].address);
    });

  });

  describe("joinGame()", function () {
    it("should allow users to join a game", async function () {
      await shuffle.setGameContract(hiLo.address)
      const user1 = hiLo.connect(accounts[1]);
      const user2 = hiLo.connect(accounts[2]);
      const createGameTx = await user1.createGame([pkArray[0][0], pkArray[0][1]]);
      const createGameEvent = await createGameTx.wait().then((receipt) => {
        return receipt.events[0].args;
      });
      const gameId = createGameEvent[0];
      const joinGameTx = await user2.joinGame(gameId, [pkArray[1][0], pkArray[1][1]]);
      const joinGameEvent = await joinGameTx.wait().then((receipt) => {
        return receipt.events[0].args;
      }
      );
      expect(joinGameEvent[0]).to.equal(gameId);
      expect(joinGameEvent[1]).to.equal(1);
      expect(joinGameEvent[2]).to.equal(accounts[2].address);

    });
  })

  describe("shuffle()", function () {
    it("should allow users to shuffle", async function () {
      const shuffleEncryptV2WasmFile = resolve(resourceBasePath, './wasm/shuffle_encrypt_v2.wasm');
      const shuffleEncryptV2ZkeyFile = resolve(resourceBasePath, './zkey/shuffle_encrypt_v2.zkey');
      await shuffle.setGameContract(hiLo.address)
      const user1 = hiLo.connect(accounts[1]);
      const user2 = hiLo.connect(accounts[2]);

      const createGameTx = await user1.createGame([pkArray[0][0], pkArray[0][1]]);
      const createGameEvent = await createGameTx.wait().then((receipt) => {
        return receipt.events[0].args;
      });
      const gameId = 1;
      await user2.joinGame(gameId, [pkArray[1][0], pkArray[1][1]]);
      const key = await shuffle.queryAggregatedPk(gameId);
      const aggregatedPk = [key[0].toBigInt(), key[1].toBigInt()];
      let A = samplePermutation(Number(numCards));
      let R = sampleFieldElements(babyjub, numBits, BigInt(numCards));
      const { solidityProof: proof1, shuffleEncryptV2Output: output1 } = await shuffleDeck(babyjub, A, R, aggregatedPk, Number(numCards), gameId, shuffle, shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile);
      await user1.shuffle(proof1, output1.publicSignals[0], output1.publicSignals.slice(107, 159), output1.publicSignals.slice(159, 211), [output1.publicSignals[213], output1.publicSignals[214]], gameId, { gasLimit: 10000000 });
      const { solidityProof:proof2, shuffleEncryptV2Output:output2} = await shuffleDeck(babyjub, A, R, aggregatedPk, Number(numCards), gameId, shuffle, shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile);
      await user2.shuffle(proof2, output2.publicSignals[0], output2.publicSignals.slice(107, 159), output2.publicSignals.slice(159, 211), [output2.publicSignals[213], output2.publicSignals[214]], gameId, { gasLimit: 10000000 });

    });
  });

  describe("dealHands()", function () {
    it("deals user a handcard", async function () {
      const gameId = 1;

    });
  });


});
