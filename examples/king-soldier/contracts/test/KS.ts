import { readFileSync } from "fs";
import { ethers } from "hardhat";
import { resolve } from "path";

import {
  generateDecryptProof,
  generateShuffleEncryptV2Proof,
  packToSolidityProof,
  SolidityProof,
} from "@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/proof";
import {
  convertPk,
  keyGen,
  sampleFieldElements,
  samplePermutation,
  prepareShuffleDeck,
  string2Bigint,
  prepareDecryptData,
  ecX2Delta,
} from "@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/utilities";
import { shuffleEncryptV2Plaintext } from "@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/plaintext";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const buildBabyjub = require("circomlibjs").buildBabyjub;
const snarkjs = require("snarkjs");

const fs = require("fs");
const path = require("path");
const https = require("https");

const HOME_DIR = require("os").homedir();
const P0X_DIR = resolve(HOME_DIR, "./.poseidon-zkp");
const P0X_AWS_URL = "https://p0x-labs.s3.amazonaws.com/refactor/";
async function dnld_aws(file_name: string) {
  fs.mkdir(P0X_DIR, () => {});
  fs.mkdir(resolve(P0X_DIR, "./wasm"), () => {});
  fs.mkdir(resolve(P0X_DIR, "./zkey"), () => {});
  return new Promise((reslv, reject) => {
    if (!fs.existsSync(resolve(P0X_DIR, file_name))) {
      const file = fs.createWriteStream(resolve(P0X_DIR, file_name));
      https.get(P0X_AWS_URL + file_name, (resp: any) => {
        file.on("finish", () => {
          file.close();
          reslv(0);
        });
        resp.pipe(file);
      });
    } else {
      reslv(0);
    }
  });
}

const resourceBasePath = P0X_DIR;

// Deploys shuffle_encrypt_verifier_5cards.
async function deployEncrypt() {
  return await (
    await ethers.getContractFactory("Shuffle_encryptVerifier_5cards")
  ).deploy();
}

// Depploys contract for decryption.
async function deployDecrypt() {
  return await (await ethers.getContractFactory("DecryptVerifier")).deploy();
}

// Deploys contract for shuffle state machine.
async function deployStateMachine(shuffleStateMachineOwner: SignerWithAddress) {
  const shuffle_encrypt = await deployEncrypt();
  const decrypt_verifier_contract = await deployDecrypt();
  return await (await ethers.getContractFactory("Shuffle"))
    .connect(shuffleStateMachineOwner)
    .deploy(shuffle_encrypt.address, decrypt_verifier_contract.address);
}

async function generateShuffleData(
  babyjub: any,
  aggregatedPk: any,
  numBits: bigint,
  numCards: bigint,
  deck: any,
  shuffleEncryptV2WasmFile: string,
  shuffleEncryptV2ZkeyFile: string
): Promise<[SolidityProof, bigint[], string[]]> {
  let A = samplePermutation(Number(numCards));
  let R = sampleFieldElements(babyjub, numBits, numCards);

  let aggregatedPkEC = [
    babyjub.F.e(aggregatedPk[0]),
    babyjub.F.e(aggregatedPk[1]),
  ];
  let preprocessedDeck = prepareShuffleDeck(babyjub, deck, Number(numCards));
  let plaintext_output = shuffleEncryptV2Plaintext(
    babyjub,
    Number(numCards),
    A,
    R,
    aggregatedPkEC,
    preprocessedDeck.X0,
    preprocessedDeck.X1,
    preprocessedDeck.Delta[0],
    preprocessedDeck.Delta[1],
    preprocessedDeck.Selector
  );
  let shuffleEncryptV2Output = await generateShuffleEncryptV2Proof(
    aggregatedPk,
    A,
    R,
    preprocessedDeck.X0,
    preprocessedDeck.X1,
    preprocessedDeck.Delta[0],
    preprocessedDeck.Delta[1],
    preprocessedDeck.Selector,
    plaintext_output.X0,
    plaintext_output.X1,
    plaintext_output.delta0,
    plaintext_output.delta1,
    plaintext_output.selector,
    shuffleEncryptV2WasmFile,
    shuffleEncryptV2ZkeyFile
  );
  let solidityProof: SolidityProof = packToSolidityProof(
    shuffleEncryptV2Output.proof
  );

  return [
    solidityProof,
    combineShuffleData(shuffleEncryptV2Output.publicSignals, Number(numCards)),
    shuffleEncryptV2Output.publicSignals,
  ];
}

function combineShuffleData(signals: string[], numCards: number): bigint[] {
  const nonce = [BigInt(signals[0])];
  const shuffledX0 = string2Bigint(
    signals.slice(2 * numCards + 3, 3 * numCards + 3)
  );
  const shuffledX1 = string2Bigint(
    signals.slice(3 * numCards + 3, 4 * numCards + 3)
  );
  const selector = string2Bigint(
    signals.slice(4 * numCards + 5, 4 * numCards + 7)
  );

  return nonce.concat(shuffledX0).concat(shuffledX1).concat(selector);
}

async function generateDealData(
  babyjub: any,
  numCards: number,
  cardIdx: number,
  sk: bigint,
  pk: bigint[],
  card: any,
  decryptWasmFile: string,
  decryptZkeyFile: string
): Promise<[SolidityProof, string[], bigint[]]> {
  let Y = prepareDecryptData(
    babyjub,
    card[0],
    card[1],
    card[2],
    card[3],
    Number(numCards),
    cardIdx
  );
  let decryptProof = await generateDecryptProof(
    Y,
    sk,
    pk,
    decryptWasmFile,
    decryptZkeyFile
  );
  let solidityProof: SolidityProof = packToSolidityProof(decryptProof.proof);

  return [
    solidityProof,
    decryptProof.publicSignals,
    [ecX2Delta(babyjub, Y[0]), ecX2Delta(babyjub, Y[2])],
  ];
}

async function generateShowHandData(
  sk: bigint,
  pk: bigint[],
  card: any,
  decryptWasmFile: string,
  decryptZkeyFile: string
): Promise<[SolidityProof, string[]]> {
  let decryptProof = await generateDecryptProof(
    [
      card[0].toBigInt(),
      card[1].toBigInt(),
      card[2].toBigInt(),
      card[3].toBigInt(),
    ],
    sk,
    pk,
    decryptWasmFile,
    decryptZkeyFile
  );
  let solidityProof: SolidityProof = packToSolidityProof(decryptProof.proof);

  return [solidityProof, decryptProof.publicSignals];
}

describe("KS test", function () {
  const NumCard2Deal = 5;
  const numPlayers = 2;
  const numCards = BigInt(5);
  const numBits = BigInt(251);

  beforeEach(async () => {});
  beforeEach(async () => {
    await Promise.all(
      [
        "wasm/encrypt.wasm.5",
        "wasm/decrypt.wasm",
        "zkey/encrypt.zkey.5",
        "zkey/decrypt.zkey",
      ].map(async (e) => {
        await dnld_aws(e);
      })
    );
  });

  it("KS Game works normally", async () => {
    const shuffleEncryptV2WasmFile = resolve(
      resourceBasePath,
      "./wasm/encrypt.wasm.5"
    );
    const shuffleEncryptV2ZkeyFile = resolve(
      resourceBasePath,
      "./zkey/encrypt.zkey.5"
    );
    const shuffleEncryptV2Vkey = await snarkjs.zKey.exportVerificationKey(
      new Uint8Array(Buffer.from(readFileSync(shuffleEncryptV2ZkeyFile)))
    );

    const decryptWasmFile = resolve(resourceBasePath, "./wasm/decrypt.wasm");
    const decryptZkeyFile = resolve(resourceBasePath, "./zkey/decrypt.zkey");

    // deploy
    const [deployer, Alice, Bob] = await ethers.getSigners();
    const shuffle1 = await deployStateMachine(deployer);
    const shuffle2 = await deployStateMachine(deployer);
    const ks = await (await ethers.getContractFactory("KS"))
      .connect(deployer)
      .deploy(shuffle1.address, shuffle2.address);
    // set game contract
    await shuffle1.setGameContract(ks.address);
    await shuffle2.setGameContract(ks.address);

    const babyjub = await buildBabyjub();

    const pkArray: any[] = [];
    const skArray: any[] = [];
    for (let i = 0; i < numPlayers; i++) {
      const key = keyGen(babyjub, numBits);
      pkArray.push(key.pk);
      skArray.push(key.sk);
    }
    const convertPkArray = convertPk(babyjub, pkArray);

    /*
      register
      Alice create a game using Soldier
      Bob joion the game using King
    */
    const createGameTx = await (
      await ks
        .connect(Alice)
        .createGame([convertPkArray[0][0], convertPkArray[0][1]], 1)
    ).wait();
    const gameId = Number(await createGameTx.events[0].args.gameId);
    await ks
      .connect(Bob)
      .joinGame(gameId, [convertPkArray[1][0], convertPkArray[1][1]], 0);

    console.log(`Alice: ${Alice.address}, Bob: ${Bob.address}`);
    console.log(
      "Alice creates a game using Soldier, Bob joins the game using King"
    );

    // shuffle
    // every deck holds a pair of key, in this case, both decks hold same keypair, so we only search for once
    const key = await ks.queryAggregatedPk(gameId, 0);
    const aggregatedPk = [key[0].toBigInt(), key[1].toBigInt()];

    let deck1 = await ks.queryDeck(gameId, 0);
    let deck2 = await ks.queryDeck(gameId, 1);
    let [proof1, shuffleData1, output1] = await generateShuffleData(
      babyjub,
      aggregatedPk,
      numBits,
      numCards,
      deck1,
      shuffleEncryptV2WasmFile,
      shuffleEncryptV2ZkeyFile
    );
    let [proof2, shuffleData2, output2] = await generateShuffleData(
      babyjub,
      aggregatedPk,
      numBits,
      numCards,
      deck2,
      shuffleEncryptV2WasmFile,
      shuffleEncryptV2ZkeyFile
    );
    await ks
      .connect(Alice)
      .shuffle(proof1, proof2, shuffleData1, shuffleData2, gameId);
    console.log("Alice shuffled 2 decks");

    deck1 = await ks.queryDeck(gameId, 0);
    deck2 = await ks.queryDeck(gameId, 1);
    [proof1, shuffleData1, output1] = await generateShuffleData(
      babyjub,
      aggregatedPk,
      numBits,
      numCards,
      deck1,
      shuffleEncryptV2WasmFile,
      shuffleEncryptV2ZkeyFile
    );
    [proof2, shuffleData2, output2] = await generateShuffleData(
      babyjub,
      aggregatedPk,
      numBits,
      numCards,
      deck2,
      shuffleEncryptV2WasmFile,
      shuffleEncryptV2ZkeyFile
    );
    await ks
      .connect(Bob)
      .shuffle(proof1, proof2, shuffleData1, shuffleData2, gameId);
    console.log("Bob shuffled 2 decks");

    // deal
    // deal to Alice
    const alicePlayerIdx = 0;
    for (let i = 0; i < 5; i++) {
      const card = await ks.queryCardFromDeck(gameId, i, alicePlayerIdx);
      const [proof, decryptedData, initDelta] = await generateDealData(
        babyjub,
        Number(numCards),
        i,
        skArray[1],
        convertPkArray[1],
        card,
        decryptWasmFile,
        decryptZkeyFile
      );
      await ks
        .connect(Bob)
        .dealHandCard(
          gameId,
          i,
          proof,
          [decryptedData[0], decryptedData[1]],
          [initDelta[0], initDelta[1]]
        );
      console.log(`Bob deal to Alice card ${i}`);
    }

    // deal to Bob
    const bobPlayerIdx = 1;
    for (let i = 0; i < 5; i++) {
      const card = await ks.queryCardFromDeck(gameId, i, bobPlayerIdx);
      const [proof, decryptedData, initDelta] = await generateDealData(
        babyjub,
        Number(numCards),
        i,
        skArray[0],
        convertPkArray[0],
        card,
        decryptWasmFile,
        decryptZkeyFile
      );
      await ks
        .connect(Alice)
        .dealHandCard(
          gameId,
          i,
          proof,
          [decryptedData[0], decryptedData[1]],
          [initDelta[0], initDelta[1]]
        );
      console.log(`Alice deal to Bob card ${i}`);
    }

    // choos and show card
    for (let i = 0; i < 5; i++) {
      await ks.connect(Alice).chooseCard(gameId, i, i);
      await ks.connect(Bob).chooseCard(gameId, i, i);

      const aliceCard = await ks.queryCardInDeal(gameId, i, alicePlayerIdx);
      let [proof, decryptedData] = await generateShowHandData(
        skArray[0],
        convertPkArray[0],
        aliceCard,
        decryptWasmFile,
        decryptZkeyFile
      );

      await ks
        .connect(Alice)
        .showHand(gameId, i, proof, [decryptedData[0], decryptedData[1]]);

      const aliceCardValue = await ks.getCardValue(gameId, i, 0);
      const aliceRole = Number(aliceCardValue) == 0 ? "Soldier" : "Citizen";

      console.log(
        `In the round ${i + 1}, Alice showed her card No.${
          i + 1
        }, and this card is ${aliceRole}`
      );

      const bobCard = await ks.queryCardInDeal(gameId, i, bobPlayerIdx);
      [proof, decryptedData] = await generateShowHandData(
        skArray[1],
        convertPkArray[1],
        bobCard,
        decryptWasmFile,
        decryptZkeyFile
      );
      await ks
        .connect(Bob)
        .showHand(gameId, i, proof, [decryptedData[0], decryptedData[1]]);
      const bobCardValue = await ks.getCardValue(gameId, i, 1);
      const bobRole = Number(bobCardValue) == 0 ? "King" : "Citizen";
      console.log(
        `In the round ${i + 1}, Bob showed his card No.${
          i + 1
        }, and this card is ${bobRole}`
      );

      const winner = (await ks.getGameInfo(gameId)).winner;
      if (winner != ethers.constants.AddressZero) {
        console.log(`we got a winner ${winner}`);
        return;
      }
    }
  });
});
