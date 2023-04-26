import { Contract, ethers } from 'ethers';
import { useState } from 'react';
import { buildBabyjub } from 'circomlibjs';
import { getContract } from '@wagmi/core';
import { contracts as contractInfos } from '../const/contracts';

import { PlayerInfos, getBabyjub, getPlayerPksAndSks } from '../utils/newUtils';
import useWriteContract from './useWriteContract';
import useEvent from './useEvent';

export interface UseGameProps {
  creator: string;
  joiner: string;
  address?: `0x${string}`;
}

export enum GameStatus {
  WAITING_FOR_START = 'waiting for start',
  CREATED_GAME = 'created game',
  WAITING_FOR_JOIN = 'waiting for join',
  WAITING_FOR_CREATOR_SHUFFLE = 'waiting for creator shuffle',
  WAITING_FOR_JOINER_SHUFFLE = 'waiting for joiner shuffle',
}

function useGame({ creator, joiner, address }: UseGameProps) {
  const [contract, setContract] = useState<Contract>();
  const [playerPksAndSks, setPlayerPksAndSks] = useState<PlayerInfos>();
  const [gameStatus, setGameStatus] = useState(GameStatus.WAITING_FOR_START);
  const [babyjub, setBabyjub] = useState<any>();
  const [creatorStatus, setCreatorStatus] = useState({
    createGame: false,
    creatorShuffled: false,
    creatorDealt: false,
    creatorShowHand: -1,
  });

  const [joinerStatus, setJoinerStatus] = useState({
    joinGame: false,
    joinerShuffled: false,
    joinerDealt: false,
    joinerShowHand: -1,
  });

  const isCreator = creator === address;
  const gameIndex = isCreator ? 1 : 0;
  const playerAddresses = [creator, joiner];
  const userPksAndsk = playerPksAndSks?.[address as string];

  const createGameStatus = useWriteContract(contract?.['createGame'], {
    args: [[userPksAndsk?.pk[0], userPksAndsk?.pk[1]], gameIndex],
    wait: true,
  });

  const joinGameStatus = useWriteContract(contract?.['joinGame'], {
    args: [],
    wait: true,
  });

  const createGameListenValues = useEvent({
    contract,
    fnName: 'GameCreated',
    addressIndex: 1,
    creator: creator,
    joiner: joiner,
  });

  const joinGameListenValues = useEvent({
    contract,
    fnName: 'GameJoined',
    addressIndex: 1,
    creator: creator,
    joiner: joiner,
  });

  const handleGetBabyPk = async () => {
    try {
      const babyjub = await buildBabyjub();
      const babyJubs = getBabyjub(babyjub, playerAddresses.length);
      const playerPksAndSks = getPlayerPksAndSks(
        babyJubs,
        playerAddresses as string[]
      );

      setPlayerPksAndSks(playerPksAndSks);
      setBabyjub(babyjub);
    } catch (error) {}
  };

  const handleGetContracts = () => {
    if (!contractInfos) return;
    const provider = new ethers.providers.Web3Provider(
      (window as any).ethereum
    );
    const signer = provider.getSigner();
    const contract = getContract({
      address: contractInfos?.KS?.address,
      abi: contractInfos?.KS?.abi,
      signerOrProvider: signer,
    });
    setContract(contract);
  };

  return {
    isCreator,
    gameStatus,
    handleGetBabyPk,
    handleGetContracts,
    createGameStatus,
    joinGameStatus,
  };
}

export default useGame;
