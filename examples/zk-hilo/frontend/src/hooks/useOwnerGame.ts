import { Contract, ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { BabyjubResult, PlayerInfos } from '../utils/newUtils';

export interface userUserGameParams {
  ownerAddress?: string;
  ownerContract?: Contract;
  ownerPksAndSks?: BabyjubResult;
}

export function useOwnerGame({
  ownerAddress,
  ownerContract,
  ownerPksAndSks,
}: // join,
userUserGameParams) {
  const startGame = async () => {
    console.log('ownerPksAndSks', ownerPksAndSks);
    try {
      const createGame = await ownerContract?.['createGame']([
        ownerPksAndSks?.pk[0],
        ownerPksAndSks?.pk[1],
      ]);
      const createGameEvent = await createGame.wait();
    } catch (error) {
      console.log('error', error);
    }
  };

  return {
    startGame,
  };
}
