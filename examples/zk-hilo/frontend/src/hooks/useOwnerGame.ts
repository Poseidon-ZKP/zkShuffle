import { Contract, ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { BabyjubResult, PlayerInfos } from '../utils/newUtils';

import { contracts as contractInfos } from '../const/contracts';
import { useContractWrite, usePrepareContractWrite } from 'wagmi';

export interface userUserGameParams {
  ownerAddress?: string;
  ownerContract?: Contract;
  ownerPksAndSks?: BabyjubResult;
}

export const getContractWriteParams = (fucName: string, args?: any) => {
  return {
    mode: 'recklesslyUnprepared' as 'recklesslyUnprepared',
    address: contractInfos.HiLo.address,
    abi: contractInfos.HiLo.abi,
    functionName: fucName,
    args: args,
    // signerOrProvider: signer,
  };
};

export function useOwnerGame({
  ownerAddress,
  ownerContract,
  ownerPksAndSks,
}: // join,
userUserGameParams) {
  // const { config } = usePrepareContractWrite({

  //   address: contractInfos.HiLo.address,
  //   abi: contractInfos.HiLo.abi,
  //   functionName: 'createGame',
  //   enabled: false,
  //   args: [[ownerPksAndSks?.pk[0], ownerPksAndSks?.pk[1]]],
  //   // signerOrProvider: signer,
  // });
  // // console.log('first');

  // // console.log(config);
  const createGameStatus = useContractWrite(
    getContractWriteParams('createGame', [
      [ownerPksAndSks?.pk[0], ownerPksAndSks?.pk[1]],
    ])
  );

  const startGame = async () => {
    try {
      const res = await createGameStatus?.writeAsync?.();
      const waitRes = await res?.wait();
      console.log('waitRes', waitRes);
    } catch (error) {
      console.log('error', error);
    }
  };

  // console.log('createGameStatus', createGameStatus);
  return {
    startGame: startGame,
  };
}
