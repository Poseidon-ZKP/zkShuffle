import { ethers } from "hardhat";
import { expect } from "chai";
import { keyGen, convertPk, sampleFieldElements, samplePermutation } from "./helper/utilities";
import { shuffle as shuffleDeck, deal as dealCard } from "./helper/utils";
import { BigNumber } from 'ethers';
const fs = require('fs');
import { resolve } from 'path';
const https = require('https')
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
const buildBabyjub = require('circomlibjs').buildBabyjub;
const HOME_DIR = require('os').homedir();
const P0X_DIR = resolve(HOME_DIR, "./.poseidon-zkp")
const resourceBasePath = P0X_DIR;
const P0X_AWS_URL = "https://p0x-labs.s3.amazonaws.com/refactor/";
enum Guess {
  High,
  Low
}
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
    console.log("pkArray", pkArray);
    console.log("skArray", skArray);

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
      const { solidityProof: proof2, shuffleEncryptV2Output: output2 } = await shuffleDeck(babyjub, A, R, aggregatedPk, Number(numCards), gameId, shuffle, shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile);
      await user2.shuffle(proof2, output2.publicSignals[0], output2.publicSignals.slice(107, 159), output2.publicSignals.slice(159, 211), [output2.publicSignals[213], output2.publicSignals[214]], gameId, { gasLimit: 10000000 });

    });
  });

  describe("dealHands()", function () {
    it("deals user a handcard", async function () {
      const shuffleEncryptV2WasmFile = resolve(resourceBasePath, './wasm/shuffle_encrypt_v2.wasm');
      const shuffleEncryptV2ZkeyFile = resolve(resourceBasePath, './zkey/shuffle_encrypt_v2.zkey');
      const decryptWasmFile = resolve(resourceBasePath, './wasm/decrypt.wasm');
      const decryptZkeyFile = resolve(resourceBasePath, './zkey/decrypt.zkey');
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
      const { solidityProof: proof2, shuffleEncryptV2Output: output2 } = await shuffleDeck(babyjub, A, R, aggregatedPk, Number(numCards), gameId, shuffle, shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile);
      await user2.shuffle(proof2, output2.publicSignals[0], output2.publicSignals.slice(107, 159), output2.publicSignals.slice(159, 211), [output2.publicSignals[213], output2.publicSignals[214]], gameId, { gasLimit: 10000000 });

      const { publicSignals: pS1, solidityProof: solidityProof1, decryptProof: decryptProof1, initDelta: initDelta1 } = await dealCard(babyjub, Number(numCards), gameId, 1, skArray[0], pkArray[0], shuffle, decryptWasmFile, decryptZkeyFile, true);
      await user1.dealHandCard(
        gameId,
        solidityProof1,
        [decryptProof1.publicSignals[0], decryptProof1.publicSignals[1]],
        initDelta1
      )
      const { publicSignals: pS2, solidityProof: solidityProof2, decryptProof: decryptProof2, initDelta: initDelta2 } = await dealCard(babyjub, Number(numCards), gameId, 0, skArray[1], pkArray[1], shuffle, decryptWasmFile, decryptZkeyFile, true);
      await user2.dealHandCard(
        gameId,
        solidityProof2,
        [decryptProof2.publicSignals[0], decryptProof2.publicSignals[1]],
        initDelta2
      )
    });
  });

  describe("guess()", function () {
    it("should allow users to guess", async function () {
      const shuffleEncryptV2WasmFile = resolve(resourceBasePath, './wasm/shuffle_encrypt_v2.wasm');
      const shuffleEncryptV2ZkeyFile = resolve(resourceBasePath, './zkey/shuffle_encrypt_v2.zkey');
      const decryptWasmFile = resolve(resourceBasePath, './wasm/decrypt.wasm');
      const decryptZkeyFile = resolve(resourceBasePath, './zkey/decrypt.zkey');
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
      const { solidityProof: proof2, shuffleEncryptV2Output: output2 } = await shuffleDeck(babyjub, A, R, aggregatedPk, Number(numCards), gameId, shuffle, shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile);
      await user2.shuffle(proof2, output2.publicSignals[0], output2.publicSignals.slice(107, 159), output2.publicSignals.slice(159, 211), [output2.publicSignals[213], output2.publicSignals[214]], gameId, { gasLimit: 10000000 });

      const { publicSignals: pS1, solidityProof: solidityProof1, decryptProof: decryptProof1, initDelta: initDelta1 } = await dealCard(babyjub, Number(numCards), gameId, 1, skArray[0], pkArray[0], shuffle, decryptWasmFile, decryptZkeyFile, true);
      await user1.dealHandCard(
        gameId,
        solidityProof1,
        [decryptProof1.publicSignals[0], decryptProof1.publicSignals[1]],
        initDelta1
      )
      const { publicSignals: pS2, solidityProof: solidityProof2, decryptProof: decryptProof2, initDelta: initDelta2 } = await dealCard(babyjub, Number(numCards), gameId, 0, skArray[1], pkArray[1], shuffle, decryptWasmFile, decryptZkeyFile, true);
      await user2.dealHandCard(
        gameId,
        solidityProof2,
        [decryptProof2.publicSignals[0], decryptProof2.publicSignals[1]],
        initDelta2
      )

      console.log("start guess");
      const guess1 = Guess.High;
      const guess2 = Guess.Low;

      console.log("1", guess1, Guess[guess1])
      console.log("2", guess2, Guess[guess2])

      await user1.guess(guess1, BigInt(gameId));
      await user2.guess(guess2, BigInt(gameId));
    });

  });

  describe("showHand()", function () {
    it.only("should allow users to show their hand", async function () {
      const shuffleEncryptV2WasmFile = resolve(resourceBasePath, './wasm/shuffle_encrypt_v2.wasm');
      const shuffleEncryptV2ZkeyFile = resolve(resourceBasePath, './zkey/shuffle_encrypt_v2.zkey');
      const decryptWasmFile = resolve(resourceBasePath, './wasm/decrypt.wasm');
      const decryptZkeyFile = resolve(resourceBasePath, './zkey/decrypt.zkey');
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
      const { solidityProof: proof2, shuffleEncryptV2Output: output2 } = await shuffleDeck(babyjub, A, R, aggregatedPk, Number(numCards), gameId, shuffle, shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile);
      await user2.shuffle(proof2, output2.publicSignals[0], output2.publicSignals.slice(107, 159), output2.publicSignals.slice(159, 211), [output2.publicSignals[213], output2.publicSignals[214]], gameId, { gasLimit: 10000000 });

      const { publicSignals: pS1, solidityProof: solidityProof1, decryptProof: decryptProof1, initDelta: initDelta1 } = await dealCard(babyjub, Number(numCards), gameId, 1, skArray[0], pkArray[0], shuffle, decryptWasmFile, decryptZkeyFile, true);
      await user1.dealHandCard(
        gameId,
        solidityProof1,
        [decryptProof1.publicSignals[0], decryptProof1.publicSignals[1]],
        initDelta1
      )
      const { publicSignals: pS2, solidityProof: solidityProof2, decryptProof: decryptProof2, initDelta: initDelta2 } = await dealCard(babyjub, Number(numCards), gameId, 0, skArray[1], pkArray[1], shuffle, decryptWasmFile, decryptZkeyFile, true);
      await user2.dealHandCard(
        gameId,
        solidityProof2,
        [decryptProof2.publicSignals[0], decryptProof2.publicSignals[1]],
        initDelta2
      )

      console.log("start guess");
      const guess1 = Guess.High;
      const guess2 = Guess.Low;

      console.log("1", guess1, Guess[guess1])
      console.log("2", guess2, Guess[guess2])

      await user1.guess(guess1, BigInt(gameId));
      await user2.guess(guess2, BigInt(gameId));

      console.log("start showHand")
      const { publicSignals: pS3, solidityProof: solidityProof3, decryptProof: decryptProof3, initDelta: initDelta3 } = await dealCard(babyjub, Number(numCards), gameId, 0, skArray[0], pkArray[0], shuffle, decryptWasmFile, decryptZkeyFile, false);
      console.log("decryptProof3", [BigInt(decryptProof3.publicSignals[0]), BigInt(decryptProof3.publicSignals[1])])
      await user1.showHand(gameId, solidityProof3, [BigInt(decryptProof3.publicSignals[0]), BigInt(decryptProof3.publicSignals[1])]);
      const { publicSignals: pS4, solidityProof: solidityProof4, decryptProof: decryptProof4, initDelta: initDelta4 } = await dealCard(babyjub, Number(numCards), gameId, 1, skArray[1], pkArray[1], shuffle, decryptWasmFile, decryptZkeyFile, false);
      console.log("showHand 2")
      console.log("decryptProof4", [BigInt(decryptProof4.publicSignals[0]), BigInt(decryptProof4.publicSignals[1])])

      await user2.showHand(gameId, solidityProof4, [BigInt(decryptProof4.publicSignals[0]), BigInt(decryptProof4.publicSignals[1])]);

    });
  });



});
