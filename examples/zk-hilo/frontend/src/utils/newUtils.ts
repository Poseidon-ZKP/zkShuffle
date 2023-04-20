import {
  generateDecryptProof,
  generateShuffleEncryptV2Proof,
  packToSolidityProof,
  SolidityProof,
} from '@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/proof';
import snarkjs from 'snarkjs';
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
import { buildBabyjub } from 'circomlibjs';

import { getContract, getProvider } from '@wagmi/core';
import { contracts } from '../const/contracts';
import { Contract, ethers } from 'ethers';

const numBits = BigInt(251);

export interface BabyjubsResult {
  pks: string[];
  sks: string[];
}

export interface PlayerContracts {
  [key: string]: Contract;
}

export interface BabyjubResult {
  pk: string[];
  sk: string;
}

export interface PlayerInfos {
  [key: string]: {
    pk: string[];
    sk: string;
  };
}

export type RESOURCE_TYPE = 'shuffle_encrypt_v2' | 'decrypt';
export type FILE_TYPE = 'wasm' | 'zkey';

const P0X_AWS_URL = 'https://p0x-labs.s3.amazonaws.com/refactor/';

export function getResourcePath(resType: RESOURCE_TYPE, fileType: FILE_TYPE) {
  return `https://p0x-labs.s3.amazonaws.com/${fileType}/${resType}.${fileType}`;
}

const shuffleEncryptZkeyFile = getResourcePath('shuffle_encrypt_v2', 'zkey');
const shuffleEncryptWasmFile = getResourcePath('shuffle_encrypt_v2', 'wasm');
const decryptZkeyFile = getResourcePath('decrypt', 'zkey');
const decryptWasmFile = getResourcePath('decrypt', 'wasm');

export const getPlayerPksAndSks = (
  pksAndSks: BabyjubsResult,
  playerAddresses: string[]
) => {
  if (pksAndSks.pks.length !== playerAddresses.length) return;
  let newInfo = {} as any;
  playerAddresses.forEach((item, index) => {
    newInfo[item] = {
      pk: pksAndSks.pks[index],
      sk: pksAndSks.sks[index],
    };
  });
  return newInfo;
};

export async function getBabyjub(numbers: number) {
  const babyjub = await buildBabyjub();
  let pkArray: any = [];
  let skArray: any = [];
  for (let i = 0; i < numbers; i++) {
    const key = keyGen(babyjub, numBits);
    pkArray.push(key.pk);
    skArray.push(key.sk);
  }
  pkArray = convertPk(babyjub, pkArray);
  return {
    pks: pkArray,
    sks: skArray,
  };
}

export const getContracts = (addresses: string[]) => {
  let newInfo = {} as any;
  const provider = new ethers.providers.Web3Provider((window as any).ethereum);
  const signer = provider.getSigner();
  addresses.forEach((item, index) => {
    newInfo[item] = getContract({
      address: contracts.HiLo.address,
      abi: contracts.HiLo.abi,
      signerOrProvider: signer,
    });
  });
  return newInfo;
};

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
  // let shuffleEncryptV2Output = await generateShuffleEncryptV2Proof(
  //   aggregatedPk,
  //   A,
  //   R,
  //   preprocessedDeck.X0,
  //   preprocessedDeck.X1,
  //   preprocessedDeck.Delta[0],
  //   preprocessedDeck.Delta[1],
  //   preprocessedDeck.Selector,
  //   plaintext_output.X0,
  //   plaintext_output.X1,
  //   plaintext_output.delta0,
  //   plaintext_output.delta1,
  //   plaintext_output.selector,
  //   shuffleEncryptV2WasmFile,
  //   shuffleEncryptV2ZkeyFile
  // );
  // let solidityProof: SolidityProof = packToSolidityProof(
  //   shuffleEncryptV2Output.proof
  // );

  // return [
  //   solidityProof,
  //   combineShuffleData(shuffleEncryptV2Output.publicSignals, Number(numCards)),
  //   shuffleEncryptV2Output.publicSignals,
  // ];
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
