import { ethers } from 'hardhat';
import { resolve } from 'path';

import {
  generateDecryptProof,
  generateShuffleEncryptV2Proof,
  packToSolidityProof,
  SolidityProof,
} from '@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/proof';
import {
  convertPk,
  keyGen,
  sampleFieldElements,
  samplePermutation,
  string2Bigint,
  prepareDecryptData,
  ecX2Delta,
  prepareShuffleDeck,
} from '@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/utilities';
import { shuffleEncryptV2Plaintext } from '@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/plaintext';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

const fs = require('fs');
const https = require('https');
const buildBabyjub = require('circomlibjs').buildBabyjub;
const HOME_DIR = require('os').homedir();
const P0X_DIR = resolve(HOME_DIR, './.poseidon-zkp');

const resourceBasePath = P0X_DIR;
const P0X_AWS_URL = 'https://p0x-labs.s3.amazonaws.com/refactor/';

async function dnld_aws(file_name: string) {
  fs.mkdir(P0X_DIR, () => {});
  fs.mkdir(resolve(P0X_DIR, './wasm'), () => {});
  fs.mkdir(resolve(P0X_DIR, './zkey'), () => {});
  return new Promise((reslv, reject) => {
    if (!fs.existsSync(resolve(P0X_DIR, file_name))) {
      const file = fs.createWriteStream(resolve(P0X_DIR, file_name));
      https.get(P0X_AWS_URL + file_name, (resp) => {
        file.on('finish', () => {
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

// Depploys contract for decryption.
async function deployDecrypt() {
  return await (await ethers.getContractFactory('DecryptVerifier')).deploy();
}

// Deploys contract for shuffle encrypt v2.
async function deployShuffleEncryptV2() {
  const vk = await (
    await ethers.getContractFactory('ShuffleEncryptV2VerifierKey')
  ).deploy();
  return await (
    await ethers.getContractFactory('Shuffle_encrypt_v2Verifier', {
      libraries: {
        ShuffleEncryptV2VerifierKey: vk.address,
      },
    })
  ).deploy();
}

// Deploys contract for shuffle state machine.
async function deployStateMachine(shuffleStateMachineOwner: SignerWithAddress) {
  const shuffle_encrypt_v2_verifier_contract = await deployShuffleEncryptV2();
  const decrypt_verifier_contract = await deployDecrypt();
  return await (await ethers.getContractFactory('Shuffle'))
    .connect(shuffleStateMachineOwner)
    .deploy(
      shuffle_encrypt_v2_verifier_contract.address,
      decrypt_verifier_contract.address
    );
}

describe('HiLo', () => {
  let hiLo;
  let shuffle;
  let accounts;
  let pkArray: any = [];
  let skArray: any = [];
  let babyjub;

  const numCards = BigInt(52);
  const numBits = BigInt(251);
  const numPlayers = 2;

  beforeEach(async () => {
    await Promise.all(
      [
        'wasm/shuffle_encrypt.wasm',
        'wasm/decrypt.wasm',
        'zkey/shuffle_encrypt.zkey',
        'zkey/decrypt.zkey',
        'wasm/shuffle_encrypt_v2.wasm',
        'zkey/shuffle_encrypt_v2.zkey',
      ].map(async (e) => {
        console.log('Downloading');
        await dnld_aws(e);
      })
    );
    babyjub = await buildBabyjub();
    for (let i = 0; i < numPlayers; i++) {
      const key = keyGen(babyjub, numBits);
      pkArray.push(key.pk);
      skArray.push(key.sk);
    }
    pkArray = convertPk(babyjub, pkArray);

    accounts = await ethers.getSigners();
    shuffle = await deployStateMachine(accounts[0]);
    const HiLo = await ethers.getContractFactory('HiLo');
    hiLo = await HiLo.deploy(shuffle.address);
    await hiLo.deployed();
  });

  it('Hilo works normally', async () => {
    const shuffleEncryptV2WasmFile = resolve(
      resourceBasePath,
      './wasm/shuffle_encrypt_v2.wasm'
    );
    const shuffleEncryptV2ZkeyFile = resolve(
      resourceBasePath,
      './zkey/shuffle_encrypt_v2.zkey'
    );
    const decryptWasmFile = resolve(resourceBasePath, './wasm/decrypt.wasm');
    const decryptZkeyFile = resolve(resourceBasePath, './zkey/decrypt.zkey');
    await shuffle.setGameContract(hiLo.address);
    const Alice = hiLo.connect(accounts[1]);
    const Bob = hiLo.connect(accounts[2]);
    console.log(`Alice is ${Alice.address}, Bob is ${Bob.address}`);

    // Alice create a game and Bob joins the game
    const createGameTx = await Alice.createGame([pkArray[0][0], pkArray[0][1]]);
    const createGameEvent = await createGameTx.wait().then((receipt) => {
      return receipt.events[0].args;
    });
    const gameId = Number(createGameEvent.gameId);

    await Bob.joinGame(gameId, [pkArray[1][0], pkArray[1][1]]);
    console.log(`Alice created game ${gameId}, and Bob joined the game`);

    // Alice shuffle the deck
    const key = await hiLo.queryAggregatedPk(gameId);
    const aggregatedPk = [key[0].toBigInt(), key[1].toBigInt()];

    let deck = await hiLo.queryDeck(gameId);
    let [proof, shuffleData, output] = await generateShuffleData(
      babyjub,
      aggregatedPk,
      numBits,
      numCards,
      deck,
      shuffleEncryptV2WasmFile,
      shuffleEncryptV2ZkeyFile
    );
    await Alice.shuffle(proof, shuffleData, gameId, { gasLimit: 10000000 });
    console.log('Alice shuffled the deck');

    // Bob shuffle the deck
    deck = await hiLo.queryDeck(gameId);
    [proof, shuffleData, output] = await generateShuffleData(
      babyjub,
      aggregatedPk,
      numBits,
      numCards,
      deck,
      shuffleEncryptV2WasmFile,
      shuffleEncryptV2ZkeyFile
    );
    await Bob.shuffle(proof, shuffleData, gameId, { gasLimit: 10000000 });
    console.log('Bob shuffled the deck');

    // Alice deal second card to Bob
    let cardIdx = 1; // 0-51
    let card = await hiLo.queryCardFromDeck(gameId, cardIdx);
    let [dealProof, decryptedData, initDelta] = await generateDealData(
      babyjub,
      Number(numCards),
      cardIdx,
      skArray[0],
      pkArray[0],
      card,
      decryptWasmFile,
      decryptZkeyFile
    );
    await Alice.dealHandCard(
      gameId,
      cardIdx,
      dealProof,
      [decryptedData[0], decryptedData[1]],
      [initDelta[0], initDelta[1]]
    );
    console.log('Alice deal second card to Bob');

    // Bob deal first card to Alice
    cardIdx = 0;
    card = await hiLo.queryCardFromDeck(gameId, cardIdx);
    [dealProof, decryptedData, initDelta] = await generateDealData(
      babyjub,
      Number(numCards),
      cardIdx,
      skArray[1],
      pkArray[1],
      card,
      decryptWasmFile,
      decryptZkeyFile
    );
    await Bob.dealHandCard(
      gameId,
      cardIdx,
      dealProof,
      [decryptedData[0], decryptedData[1]],
      [initDelta[0], initDelta[1]]
    );
    console.log('Bob deal first card to Alice');

    // Alice show her card
    cardIdx = 0;
    card = await hiLo.queryCardInDeal(gameId, cardIdx);
    let [showProof, showData] = await generateShowHandData(
      skArray[0],
      pkArray[0],
      card,
      decryptWasmFile,
      decryptZkeyFile
    );
    await Alice.showHand(gameId, cardIdx, showProof, [
      showData[0],
      showData[1],
    ]);
    let cardValue = await Alice.getCardValue(gameId, cardIdx); // 0-51
    console.log(`Alice shows her card, and the card is ${cardValue}`);

    cardIdx = 1;
    card = await hiLo.queryCardInDeal(gameId, cardIdx);
    [showProof, showData] = await generateShowHandData(
      skArray[1],
      pkArray[1],
      card,
      decryptWasmFile,
      decryptZkeyFile
    );
    await Bob.showHand(gameId, cardIdx, showProof, [showData[0], showData[1]]);
    cardValue = await Bob.getCardValue(gameId, cardIdx);
    console.log(`Bob shows his card, and the card is ${cardValue}`);

    const winner = (await hiLo.getGameInfo(gameId)).winner;
    console.log('winner is', winner);
  });
});
