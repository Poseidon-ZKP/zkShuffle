import { ethers } from "hardhat";
import { expect } from "chai";
import { keyGen, convertPk } from "./helper/utilities";
import { BigNumber } from 'ethers';

const buildBabyjub = require('circomlibjs').buildBabyjub;

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

async function generatePk() {
  const numPlayers = 2;
  const numBits = BigInt(251);
  const keys: any = [];
  let pkArray: any = [];
  const skArray: any = [];
  const babyjub = await buildBabyjub();

  for (let i = 0; i < numPlayers; i++) {
    keys.push(keyGen(babyjub, numBits));
    pkArray.push(keys[i].pk);
    skArray.push(keys[i].sk);
  }
  pkArray = convertPk(babyjub, pkArray);

  return { pkArray, skArray };
}

describe("HiLo", () => {

  let hiLo;
  let shuffle;
  let accounts;

  beforeEach(async () => {
    shuffle = await deployStateMachine();
    const HiLo = await ethers.getContractFactory("HiLo");
    hiLo = await HiLo.deploy(shuffle.address);
    await hiLo.deployed();
    accounts = await ethers.getSigners();
  });

  describe("createGame()", function () {
    it("should allow users to create a game", async function () {
      const { pkArray } = await generatePk();
      await shuffle.setGameContract(hiLo.address)
      const user1 = accounts[0];
      console.log("pkarray ", pkArray)
      console.log("user1 ", user1.address)
      const gameId = await hiLo.createGame([pkArray[0][0], pkArray[0][1]], { from: user1.address });
      const game = await hiLo.games(gameId);
      expect(game.stage).to.equal(0);
      expect(game.playerAddress[0]).to.equal(await ethers.getSigner(0).getAddress());

    });
  });

  
});