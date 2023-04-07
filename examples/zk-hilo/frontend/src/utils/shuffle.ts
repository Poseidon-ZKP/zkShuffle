const buildBabyjub = require('circomlibjs').buildBabyjub;
const snarkjs = require('snarkjs');
import { BigNumber } from "ethers";
import { keyGen, convertPk, compressDeck, initDeck, samplePermutation, sampleFieldElements, recoverDeck, string2Bigint, prepareDecryptData, searchDeck } from "./utils";
import { packToSolidityProof, SolidityProof, generateShuffleEncryptV2Proof, generateDecryptProof, FullProof, shuffle, deal} from "./proof";
import { shuffleEncryptV2Plaintext } from "./plaintext"
import { assert } from 'chai';
import { resolve } from 'path';
import { ethers } from "ethers";
import { contracts } from "../const/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const numBits = BigInt(251);
const babyjub = await buildBabyjub();
const HOME_DIR = require('os').homedir();
const P0X_DIR = resolve(HOME_DIR, "./.poseidon-zkp")
const P0X_AWS_URL = "https://p0x-labs.s3.amazonaws.com/refactor/"
const https = require('https')
const fs = require('fs');

async function dnld_aws(file_name: string) {
    fs.mkdir(P0X_DIR, () => { })
    fs.mkdir(resolve(P0X_DIR, './wasm'), () => { })
    fs.mkdir(resolve(P0X_DIR, './zkey'), () => { })
    return new Promise((reslv, reject) => {
        if (!fs.existsSync(resolve(P0X_DIR, file_name))) {
            const file = fs.createWriteStream(resolve(P0X_DIR, file_name))
            https.get(P0X_AWS_URL + file_name, (resp: any) => {
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


// Step 0: before everything, need to download these files to local first 
export async function downloadRequiredFiles(): Promise<void> {
    const fileNames = ['wasm/shuffle_encrypt.wasm', 'wasm/decrypt.wasm', 'zkey/shuffle_encrypt.zkey', 'zkey/decrypt.zkey', 'wasm/shuffle_encrypt_v2.wasm', 'zkey/shuffle_encrypt_v2.zkey'];
    await Promise.all(fileNames.map(async (fileName) => {
        await dnld_aws(fileName);
    }));
}

// Step 1: Load metadata.
const resourceBasePath = P0X_DIR;
const shuffleEncryptV2WasmFile = resolve(resourceBasePath, './wasm/shuffle_encrypt_v2.wasm');
const shuffleEncryptV2ZkeyFile = resolve(resourceBasePath, './zkey/shuffle_encrypt_v2.zkey');
const decryptWasmFile = resolve(resourceBasePath, './wasm/decrypt.wasm');
const decryptZkeyFile = resolve(resourceBasePath, './zkey/decrypt.zkey');
const gameId = 1; // Could be any positive number. 

let playerAddrs: any = [];
const serverAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";//from local network
const userAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";//from local network
const gameContractAddress = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";//from broadcast
playerAddrs = [serverAddress, userAddress];
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // the private key of the account that deploys the game contract
const signer = new ethers.Wallet(privateKey, provider);
const gameContract = new ethers.Contract(gameContractAddress, contracts.HiLo.abi, signer);
const gameContractSigner  = await SignerWithAddress.create(signer);
const stateMachineContract = new ethers.Contract(contracts.Shuffle.address, contracts.Shuffle.abi, provider);

// Step 2: register players, 2 for hilo game, one user one server 
export async function registerPlayers(numPlayers: bigint) {
    const keys = [];
    let pkArray = [];
    const skArray: bigint[] = [];

    for (let i = 0; i < numPlayers; i++) {
        keys.push(keyGen(babyjub, numBits));
        pkArray.push(keys[i].pk);
        skArray.push(keys[i].sk);
    }
    pkArray = convertPk(babyjub, pkArray);

    //sk array need to be stored locally in case user refresh the page
    for (let i = 0; i < numPlayers; i++) {
        await stateMachineContract.connect(signer).register(
            playerAddrs[i],
            [pkArray[i][0], pkArray[i][1]],
            gameId,
        );
    }
}

//Step 2.5: getAggregatePk
export async function getAggregatePk() {
    const key = await stateMachineContract.queryAggregatedPk(gameId);
    const aggregatePk = [key[0].toBigInt(), key[1].toBigInt()];
    return aggregatePk;
}


// Step 3: shuffle cards
export async function shuffleCards(numPlayers:bigint, numCards:bigint) {
    const aggregatePk = await getAggregatePk();
    for (let i = 0; i < numPlayers; i++) {
        let A = samplePermutation(Number(numCards));
        let R = sampleFieldElements(babyjub, numBits, numCards);
        await shuffle(babyjub, A, R, aggregatePk, Number(numCards), gameId, playerAddrs[i], gameContractSigner, stateMachineContract, shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile);
        console.log('Player' + String(i) + ' shuffled the card!');
    }
}

// Step 4: decrypt cards
export async function decryptCards(numPlayers:bigint, numCards:bigint,  NumCard2Deal:bigint, skArray:any, pkArray:any) {
    const initialDeck = initDeck(babyjub, Number(numCards));
  
    for (let i = 0; i < NumCard2Deal; i++) {
      let flag = true;
      let card = [];
      for (let j = 0; j < numPlayers; j++) {
        const curPlayerIdx = (i + j) % Number(numPlayers);
        if (j > 0) flag = false;
        card = await deal(babyjub, Number(numCards), gameId, i, curPlayerIdx, skArray[curPlayerIdx], pkArray[curPlayerIdx], playerAddrs[curPlayerIdx], gameContractSigner, stateMachineContract, decryptWasmFile, decryptZkeyFile, flag);
        if (j === Number(numPlayers)- 1) {
          const cardIdx = searchDeck(initialDeck, card[0], Number(numCards));
          console.log('cardIdx: ', cardIdx);
        }
      }
    }
  
    console.log('Decrypt Done!!!');
  }
  
