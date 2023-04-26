import { Contract, ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { buildBabyjub } from 'circomlibjs';
import { getContract } from '@wagmi/core';
import { contracts as contractInfos } from '../const/contracts';

import { PlayerInfos, getBabyjub, getPlayerPksAndSks } from '../utils/newUtils';
import useWriteContract from './useWriteContract';
import useEvent from './useEvent';
import { useZKContext } from './useZKContext';

export interface UseGameProps {
  creator: string;
  joiner: string;
  address?: `0x${string}`;
}

export enum CardType {
  KING = 0,
  SOLDIER = 1,
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
  const [gameId, setGameId] = useState();
  const [gameStatus, setGameStatus] = useState(GameStatus.WAITING_FOR_START);
  const [babyjub, setBabyjub] = useState<any>();
  const [cardType, setCardType] = useState<CardType>();
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

  const zkContext = useZKContext();

  const isCreator = creator === address;
  const creatorCardType = cardType;
  const joinerCardType =
    cardType === CardType.KING ? CardType.SOLDIER : CardType.KING;
  const userCardType = isCreator ? creatorCardType : joinerCardType;
  const playerAddresses = [creator, joiner];
  const userPksAndsk = playerPksAndSks?.[address as string];

  const createGameStatus = useWriteContract(contract?.['createGame'], {
    args: [],
    wait: true,
  });

  const joinGameStatus = useWriteContract(contract?.['joinGame'], {
    args: [],
    wait: true,
  });

  const shuffleStatus = useWriteContract(contract?.['shuffle'], {
    args: [],
    wait: true,
  });

  const createGameListenerValues = useEvent({
    contract,
    fnName: 'GameCreated',
    addressIndex: 1,
    creator: creator,
    joiner: joiner,
  });

  const joinGameListenerValues = useEvent({
    contract,
    fnName: 'GameJoined',
    addressIndex: 1,
    creator: creator,
    joiner: joiner,
  });

  const shuffleDeckListenerValues = useEvent({
    contract,
    fnName: 'ShuffleDeck',
    addressIndex: 1,
    creator: creator,
    joiner: joiner,
  });

  const dealCardListenerValues = useEvent({
    contract,
    fnName: 'DealCard',
    addressIndex: 2,
    creator: creator,
    joiner: joiner,
  });

  const chooseCardListenerValues = useEvent({
    contract,
    fnName: 'ChooseCard',
    addressIndex: 2,
    creator: creator,
    joiner: joiner,
  });

  const gameEndedListenerValues = useEvent({
    contract,
    fnName: 'GameEnded',
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

  const handleShuffle = async () => {
    try {
      const key = await contract?.queryAggregatedPk(gameId, userCardType);
      const aggregatedPk = [key[0].toBigInt(), key[1].toBigInt()];
      const deck1 = await contract?.queryDeck(gameId, creatorCardType);
      const [proof1, shuffleData1] = await zkContext?.genShuffleProof(
        babyjub,
        aggregatedPk,
        deck1
      );
      const deck2 = await contract?.queryDeck(gameId, joinerCardType);

      const [proof2, shuffleData2] = await zkContext?.genShuffleProof(
        babyjub,
        aggregatedPk,
        deck2
      );
      await shuffleStatus.run(
        proof1,
        proof2,
        shuffleData1,
        shuffleData2,
        gameId
      );
    } catch (error) {
      console.log('error', error);
    }
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

  useEffect(() => {
    if (createGameListenerValues.handValues.creator) {
      console.log('first', createGameListenerValues.handValues.creator);
    }
  }, [createGameListenerValues.handValues.creator]);

  useEffect(() => {
    if (
      shuffleDeckListenerValues.handValues.creator &&
      shuffleDeckListenerValues.handValues.joiner
    ) {
      // TODO
    }
  }, [
    shuffleDeckListenerValues.handValues.creator,
    shuffleDeckListenerValues.handValues.joiner,
  ]);

  return {
    isCreator,
    gameStatus,
    handleGetBabyPk,
    handleGetContracts,
    createGameStatus,
    joinGameStatus,
    userPksAndsk,
  };
}

export default useGame;
