import { Contract, ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { buildBabyjub } from 'circomlibjs';
import { getContract } from '@wagmi/core';
import { contracts as contractInfos } from '../const/contracts';

import { PlayerInfos, getBabyjub, getPlayerPksAndSks } from '../utils/newUtils';
import useWriteContract from './useWriteContract';
import useEvent from './useEvent';
import { useZKContext } from './useZKContext';
import { genArrayFromNum, sleep } from '../utils/common';
import { sortBy } from 'lodash';
export interface UseGameProps {
  creator: string;
  joiner: string;
  address?: `0x${string}`;
}
export interface CardInfo {
  isFlipped: boolean;
  isChoose: boolean;
  value: number;
  isCurrent: boolean;
  index: number;
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
  WAITING_FOR_DEAL = 'waiting for deal',
  WAITING_FOR_CHOOSE = 'waiting for choose',
  WAITING_FOR_CREATOR_SHOW_HAND = 'waiting for creator show hand',
}

export const CARD_NUM = 5;

function useGame({ creator, joiner, address }: UseGameProps) {
  const [contract, setContract] = useState<Contract>();
  const [playerPksAndSks, setPlayerPksAndSks] = useState<PlayerInfos>();
  const [gameId, setGameId] = useState();
  const [gameStatus, setGameStatus] = useState(GameStatus.WAITING_FOR_START);
  const [babyjub, setBabyjub] = useState<any>();
  const [cardType, setCardType] = useState<CardType>();
  const [creatorCards, setCreatorCards] = useState<CardInfo[]>([]);
  const [joinerCards, setJoinerCards] = useState<CardInfo[]>([]);
  const [creatorStatus, setCreatorStatus] = useState({
    createGame: false,
    creatorShuffled: false,
    creatorDealt: false,
    creatorChoose: false,
    creatorShowHand: -1,
  });

  const [joinerStatus, setJoinerStatus] = useState({
    joinGame: false,
    joinerShuffled: false,
    joinerDealt: false,
    joinerChoose: false,
    joinerShowHand: -1,
  });

  const zkContext = useZKContext();
  const isCreator = creator === address;
  const creatorCardType = cardType as CardType;
  const joinerCardType =
    cardType === CardType.KING ? CardType.SOLDIER : CardType.KING;
  const userCardType = isCreator ? creatorCardType : joinerCardType;
  const playerAddresses = [creator, joiner];
  const userPksAndsk = playerPksAndSks?.[address as string];

  const createGameKingStatus = useWriteContract(contract?.['createGame'], {
    args: [],
    wait: true,
  });
  const createGameSoldierStatus = useWriteContract(contract?.['createGame'], {
    args: [],
    wait: true,
  });

  const createGameStatus = {
    isSuccess:
      createGameKingStatus.isSuccess || createGameSoldierStatus.isSuccess,
    isError: createGameKingStatus.isError || createGameSoldierStatus.isError,
    isLoading:
      createGameKingStatus.isLoading || createGameSoldierStatus.isLoading,
  };

  const joinGameStatus = useWriteContract(contract?.['joinGame'], {
    args: [],
    wait: true,
  });

  const shuffleStatus = useWriteContract(contract?.['shuffle'], {
    args: [],
    wait: true,
  });

  const dealStatus = useWriteContract(contract?.['dealHandCard'], {
    args: [],
    wait: true,
  });

  const chooseStatus = useWriteContract(contract?.['chooseCard'], {});

  const showHandStatus = useWriteContract(contract?.['showHand'], {});

  const createGameListenerValues = useEvent({
    contract,
    filter: contract?.filters?.GameCreated(),
    isStop: gameStatus !== GameStatus.WAITING_FOR_START,
    addressIndex: 1,

    others: {
      creator: creator,
      joiner: joiner,
    },
  });

  const joinGameListenerValues = useEvent({
    contract,
    isStop: gameStatus !== GameStatus.WAITING_FOR_JOIN,
    filter: contract?.filters?.GameJoined(),
    addressIndex: 1,

    others: {
      creator: creator,
      joiner: joiner,
      gameId,
    },
  });

  const shuffleDeckListenerValues = useEvent({
    contract,
    filter: contract?.filters?.ShuffleDeck(),
    addressIndex: 1,
    isStop:
      gameStatus !== GameStatus.WAITING_FOR_CREATOR_SHUFFLE &&
      gameStatus !== GameStatus.WAITING_FOR_JOINER_SHUFFLE,
    others: {
      creator: creator,
      joiner: joiner,
      gameId,
    },
  });

  const dealCardListenerValues = useEvent({
    contract,
    filter: contract?.filters?.DealCard(),
    addressIndex: 2,
    isStop: gameStatus !== GameStatus.WAITING_FOR_DEAL,
    others: {
      creator: creator,
      joiner: joiner,
      gameId,
    },
  });

  const chooseCardListenerValues = useEvent({
    contract,
    filter: contract?.filters?.ChooseCard(),
    addressIndex: 2,
    isStop: gameStatus !== GameStatus.WAITING_FOR_CHOOSE,
    others: {
      creator: creator,
      joiner: joiner,
      gameId,
    },
  });

  const showHandListenerValues = useEvent({
    contract,
    filter: contract?.filters?.ShowHand(),
    addressIndex: 2,
    isStop: gameStatus !== GameStatus.WAITING_FOR_CREATOR_SHOW_HAND,
    others: {
      creator: creator,
      joiner: joiner,
      gameId,
    },
  });

  const gameEndedListenerValues = useEvent({
    contract,
    filter: contract?.filters?.GameEnded(),
    isStop: true,
    addressIndex: 1,
    others: {
      creator: creator,
      joiner: joiner,
      gameId,
    },
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
      shuffleStatus.setIsLoading(true);
      await sleep(4000);
      const key = await contract?.queryAggregatedPk(gameId, userCardType);
      const aggregatedPk = [key[0].toBigInt(), key[1].toBigInt()];
      const deck1 = await contract?.queryDeck(gameId, creatorCardType);
      const [proof1, shuffleData1] = await zkContext?.genShuffleProof(
        babyjub,
        aggregatedPk,
        deck1
      );
      const deck2 = await contract?.queryDeck(gameId, joinerCardType);
      console.log('deck1', deck1);
      console.log('deck2', deck2);
      const [proof2, shuffleData2] = await zkContext?.genShuffleProof(
        babyjub,
        aggregatedPk,
        deck2
      );
      // debugger;
      await shuffleStatus.run(
        proof1,
        proof2,
        shuffleData1,
        shuffleData2,
        gameId
      );
    } catch (error) {
      console.log('error', error);
      shuffleStatus.setIsSuccess(false);
      shuffleStatus.setIsError(true);
    } finally {
      shuffleStatus.setIsLoading(false);
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

  const getCardInfos = async (cardType: CardType) => {
    const arr = genArrayFromNum(CARD_NUM);
    const cardInfos = Promise.all(
      arr.map(async (item) => {
        const res = await contract?.queryCardFromDeck(gameId, item, cardType);
        return {
          index: item,
          value: res,
          isFlipped: false,
          isCurrent: false,
          isChoose: false,
        };
      })
    );
    return cardInfos;
  };

  const handleDeal = async (cards: CardInfo[]) => {
    try {
      dealStatus.setIsLoading(true);
      await sleep(2000);
      const proofs: any[] = [];
      const decryptedDatas: any[][] = [];
      const initDeltas: any[][] = [];

      const results = await Promise.all(
        cards.map(async (item) => {
          const [proof, decryptedData, initDelta] =
            await zkContext?.generateDealData(
              item.index,
              userPksAndsk?.sk as string,
              userPksAndsk?.pk as string[],
              item.value
            );
          return {
            index: item.index,
            proof: proof,
            decryptedData,
            initDelta,
          };
        })
      );
      sortBy(results, 'index').forEach((item) => {
        proofs.push(item.proof);
        decryptedDatas.push([item.decryptedData[0], item.decryptedData[1]]);
        initDeltas.push([item.initDelta[0], item.initDelta[1]]);
      });

      await dealStatus.run(gameId, proofs, decryptedDatas, initDeltas);
    } catch (error) {
      dealStatus.setIsSuccess(false);
      dealStatus.setIsError(true);
      console.log('error', error);
    } finally {
      dealStatus.setIsLoading(false);
    }
  };

  //finished creating game
  useEffect(() => {
    if (createGameListenerValues.creator) {
      setGameStatus(GameStatus.WAITING_FOR_JOIN);
      setCardType(createGameListenerValues.creator[2]);
      setGameId(createGameListenerValues.creator[0]);
      setCreatorStatus((prev) => {
        return {
          ...prev,
          createGame: true,
        };
      });
    }
  }, [createGameListenerValues.creator]);

  //finished joining game

  useEffect(() => {
    if (joinGameListenerValues.joiner) {
      setGameStatus(GameStatus.WAITING_FOR_CREATOR_SHUFFLE);
      setJoinerStatus((prev) => {
        return {
          ...prev,
          joinGame: true,
        };
      });
    }
    return () => {};
  }, [joinGameListenerValues.joiner]);
  useEffect(() => {
    const handleCards = async () => {
      const creatorValues = await getCardInfos(creatorCardType);
      const joinerValues = await getCardInfos(joinerCardType);
      console.log('creatorValues', creatorValues);
      console.log('joinerValues', joinerValues);
      setCreatorCards(creatorValues);
      setJoinerCards(joinerValues);
    };

    if (shuffleDeckListenerValues.creator) {
      setGameStatus(GameStatus.WAITING_FOR_JOINER_SHUFFLE);
      setCreatorStatus((prev) => {
        return { ...prev, creatorShuffled: true };
      });
    }

    if (shuffleDeckListenerValues.joiner) {
      setJoinerStatus((prev) => {
        return { ...prev, joinerShuffled: true };
      });
    }

    if (shuffleDeckListenerValues.creator && shuffleDeckListenerValues.joiner) {
      setGameStatus(GameStatus.WAITING_FOR_DEAL);
      // setJoinerStatus((prev) => {
      //   return { ...prev, joinerShuffled: true };
      // });
      // setCreatorStatus((prev) => {
      //   return { ...prev, creatorShuffled: true };
      // });
      handleCards();
      // TODO
    }
  }, [
    creatorCardType,
    joinerCardType,
    shuffleDeckListenerValues.creator,
    shuffleDeckListenerValues.joiner,
  ]);

  useEffect(() => {
    if (dealCardListenerValues.creator) {
      setCreatorStatus((prev) => {
        return {
          ...prev,
          creatorDealt: true,
        };
      });
      // const findCardIndex = creatorCards.findIndex(
      //   (item) => item.index === dealCardListenerValues.creator[1]
      // );
      // if (findCardIndex > -1) {
      //   creatorCards[findCardIndex].isFlipped = true;
      //   creatorCards[findCardIndex].isCurrent = true;
      // }
      // setCreatorCards(creatorCards);
    }
    if (dealCardListenerValues.joiner) {
      setJoinerStatus((prev) => {
        return { ...prev, joinerDealt: true };
      });
      // const findCardIndex = joinerCards.findIndex(
      //   (item) => item.index === dealCardListenerValues.joiner[1]
      // );
      // if (findCardIndex > -1) {
      //   joinerCards[findCardIndex].isFlipped = true;
      //   joinerCards[findCardIndex].isCurrent = true;
      // }
      // setJoinerCards(joinerCards);
    }
    if (dealCardListenerValues.creator && dealCardListenerValues.joiner) {
      setGameStatus(GameStatus.WAITING_FOR_CHOOSE);
    }
  }, [
    creatorCards,
    dealCardListenerValues.creator,
    dealCardListenerValues.joiner,
    joinerCards,
  ]);

  useEffect(() => {
    if (chooseCardListenerValues.creator) {
      setCreatorStatus((prev) => {
        return {
          ...prev,
          creatorChoose: true,
        };
      });
      const findCardIndex = creatorCards.findIndex(
        (item) => item.index === chooseCardListenerValues.creator[1]
      );
      if (findCardIndex > -1) {
        creatorCards[findCardIndex].isChoose = true;
      }
      setCreatorCards(creatorCards);
    }
    if (chooseCardListenerValues.joiner) {
      setJoinerStatus((prev) => {
        return { ...prev, joinerChpose: true };
      });
      const findCardIndex = joinerCards.findIndex(
        (item) => item.index === chooseCardListenerValues.joiner[1]
      );
      if (findCardIndex > -1) {
        joinerCards[findCardIndex].isChoose = true;
      }
      setJoinerCards(joinerCards);
    }
    if (chooseCardListenerValues.creator && chooseCardListenerValues.joiner) {
      setGameStatus(GameStatus.WAITING_FOR_CREATOR_SHOW_HAND);
    }
  });

  useEffect(() => {
    if (showHandListenerValues.creator) {
      setCreatorStatus((prev) => {
        return {
          ...prev,
          creatorShowHand: showHandListenerValues.creator[1],
        };
      });
      const findCardIndex = creatorCards.findIndex(
        (item) => item.index === showHandListenerValues.creator[1]
      );
      if (findCardIndex > -1) {
        creatorCards[findCardIndex].isFlipped = true;
        creatorCards[findCardIndex].isCurrent = true;
      }
      setCreatorCards(creatorCards);
    }
    if (showHandListenerValues.joiner) {
      setJoinerStatus((prev) => {
        return { ...prev, joinerShowHand: showHandListenerValues.joiner[1] };
      });
      const findCardIndex = joinerCards.findIndex(
        (item) => item.index === showHandListenerValues.joiner[1]
      );
      if (findCardIndex > -1) {
        joinerCards[findCardIndex].isFlipped = true;
        joinerCards[findCardIndex].isCurrent = true;
      }
      setJoinerCards(joinerCards);
    }
    if (showHandListenerValues.creator && showHandListenerValues.joiner) {
    }
    return () => {};
  }, [showHandListenerValues.creator, showHandListenerValues.joiner]);

  console.log('GameStatus', gameStatus);
  return {
    isCreator,
    gameStatus,
    createGameKingStatus,
    createGameSoldierStatus,
    joinGameStatus,
    shuffleStatus,
    gameId,
    userPksAndsk,
    creatorStatus,
    userCardType,
    joinerStatus,
    createGameStatus,
    creatorCards,
    joinerCards,
    dealStatus,
    chooseStatus,
    handleShuffle,
    handleGetBabyPk,
    handleGetContracts,
    handleDeal,
  };
}

export default useGame;
