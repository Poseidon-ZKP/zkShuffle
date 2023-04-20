import { convertPk, keyGen } from './utils';
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

export const playerAddresses = [
  '0xFb1F17a3b7d41C8C544bf3f9A6F96266aFfa07e3',
  '0x389F62E4d0AbfA2D23a55cE4dfE9FcAB9277D0ee',
];
export const numPlayers = playerAddresses.length;
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
