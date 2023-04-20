import { Contract } from 'ethers';
import { useState } from 'react';
import { BabyjubResult, PlayerInfos } from '../utils/newUtils';

export interface userUserGameParams {
  ownerContract?: Contract;
  ownerPksAndSks?: BabyjubResult;
}

export function useOwnerGame({
  ownerContract,
  ownerPksAndSks,
}: userUserGameParams) {
  const [gameId, setGameId] = useState<number>(7);

  const startGame = async () => {
    debugger;
    try {
      const createGame = await ownerContract?.['createGame']([
        ownerPksAndSks?.pk[0],
        ownerPksAndSks?.pk[1],
      ]);
      const createGameEvent = await createGame.wait();
      const gameId = Number(createGameEvent.events[0].args.gameId);
      console.log('gameId', gameId);
      localStorage.setItem('gameId', String(gameId));
      setGameId(gameId);
    } catch (error) {
      console.log('error', error);
    }
  };

  return {
    gameId,
    startGame,
  };
}
