import { ethers } from "hardhat";
import { expect } from "chai";
import { keyGen, convertPk, sampleFieldElements, samplePermutation } from "./helper/utilities";
import { shuffle as shuffleDeck } from "./helper/proof";
import { BigNumber } from 'ethers';
const fs = require('fs');
import { resolve } from 'path';
const https = require('https')

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
async function deployStateMachine() {
  const shuffle_encrypt_v2_verifier_contract = await deployShuffleEncryptV2();
  const decrypt_verifier_contract = await deployDecrypt();
  return await (await ethers.getContractFactory('Shuffle')).deploy(
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
        await dnld_aws(e)
      }
    ));
    pkArray = [];
    skArray = [];
    shuffle = await deployStateMachine();
    const HiLo = await ethers.getContractFactory("HiLo");
    hiLo = await HiLo.deploy(shuffle.address);
    await hiLo.deployed();
    accounts = await ethers.getSigners();
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
      const gameId = createGameEvent[0];
      await user2.joinGame(gameId, [pkArray[1][0], pkArray[1][1]]);
      const key = await shuffle.queryAggregatedPk(gameId);
      const aggregatePk = [key[0].toBigInt(), key[1].toBigInt()];
      let A = samplePermutation(Number(numCards));
      let R = sampleFieldElements(babyjub, numBits, numCards);
      await shuffleDeck(babyjub, A, R, aggregatePk, Number(numCards), gameId, accounts[1].address, hiLo, shuffle, shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile);
      // await shuffleDeck(babyjub, A, R, aggregatePk, Number(numCards), gameId, accounts[2].address, hiLo, shuffle, shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile);

    });
  });
});
