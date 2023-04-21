import { Contract, ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { BabyjubResult, PlayerInfos } from '../utils/newUtils';

export interface userUserGameParams {
  userAddress?: string;
  ownerAddress?: string;
  joinerAddress?: string;
  joinerContract?: Contract;
  joinerPksAndSks?: BabyjubResult;
}

export function useJoinerGame({
  ownerAddress,
  joinerAddress,
  joinerContract,
  userAddress,
  joinerPksAndSks,
}: userUserGameParams) {
  //   const [isJoined, setIsJoined] = useState(false);
  //   useEffect(() => {
  //     if (!joinerContract) return;
  //     console.log('ownerAddress', ownerAddress);

  //     const GameCreatedListener = async (arg1: any, arg2: any, event: any) => {
  //       const gameId = Number(arg1);
  //       const creator = arg2;
  //       console.log('The event was triggered with args:', arg1, arg2);
  //       console.log('The event object is:', event);
  //       if (creator === ownerAddress) {
  //         if (joinerAddress === userAddress) {
  //           const joinGame = await joinerContract?.['joinGame'](gameId, [
  //             joinerPksAndSks?.pk[0],
  //             joinerPksAndSks?.pk[1],
  //           ]);
  //         }
  //       }
  //     };

  //     joinerContract?.on('GameCreated', GameCreatedListener);
  //     return () => {
  //       joinerContract?.off('GameCreated', GameCreatedListener);
  //     };
  //   }, [joinerContract]);

  //   useEffect(() => {
  //     if (!joinerContract) return;
  //     console.log('ownerAddress', ownerAddress);

  //     const GameJoinedListener = async (arg1: any, arg2: any, event: any) => {
  //       const joiner = arg2;
  //       if (joiner === joinerAddress) {
  //         setIsJoined(true);
  //       }
  //     };

  //     joinerContract?.on('GameJoined', GameJoinedListener);
  //     return () => {
  //       joinerContract?.off('GameJoined', GameJoinedListener);
  //     };
  //   }, [joinerContract]);

  return {
    isJoined,
  };
}
