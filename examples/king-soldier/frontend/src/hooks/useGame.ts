import { Contract, ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { buildBabyjub } from 'circomlibjs';
import { getContract } from '@wagmi/core';
import { sortBy, cloneDeep } from 'lodash';

import { contracts as contractInfos } from '../const/contracts';

import { PlayerInfos, getBabyjub, getPlayerPksAndSks } from '../utils/newUtils';
import useWriteContract from './useWriteContract';
import useEvent from './useEvent';
import { useZKContext } from './useZKContext';
import { genArrayFromNum, sleep } from '../utils/common';
import useTransactions from './useTransactions';

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
  round?: number;
}

export enum CardType {
  KING = 0,
  SOLDIER = 1,
}

export enum CardNameType {
  KING = 'King',
  SOLDIER = 'Soldier',
  CITIZEN = 'Citizen',
}

export enum PlayerType {
  CREATOR = 0,
  JOINER = 1,
}

export enum GameStatus {
  WAITING_FOR_START = 'waiting for start',
  CREATED_GAME = 'created game',
  WAITING_FOR_JOIN = 'waiting for join',
  WAITING_FOR_CREATOR_SHUFFLE = 'waiting for creator shuffle',
  WAITING_FOR_JOINER_SHUFFLE = 'waiting for joiner shuffle',
  WAITING_FOR_DEAL = 'waiting for deal',
  WAITING_FOR_CHOOSE = 'waiting for choose',
  WAITING_FOR_SHOW_HAND = 'waiting for show hand',
  WAITING_FOR_END = 'waiting for end',
  GAME_END = 'game end',
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
  const [winner, setWinner] = useState();
  const [round, setRound] = useState(0);
  const [creatorStatus, setCreatorStatus] = useState({
    createGame: false,
    creatorShuffled: false,
    creatorDealt: false,
    creatorChoose: false,
    creatorShowHand: false,
  });

  const [joinerStatus, setJoinerStatus] = useState({
    joinGame: false,
    joinerShuffled: false,
    joinerDealt: false,
    joinerChoose: false,
    joinerShowHand: false,
  });

  const zkContext = useZKContext();

  const isCreator = creator === address;
  const creatorCardType = cardType as CardType;
  const joinerCardType =
    cardType === CardType.KING ? CardType.SOLDIER : CardType.KING;
  const userCardType = isCreator ? creatorCardType : joinerCardType;
  const playerType = isCreator ? PlayerType.CREATOR : PlayerType.JOINER;
  const playerAddresses = [creator, joiner];
  const userPksAndsk = playerPksAndSks?.[address as string];

  const {
    joinGameStatus,
    shuffleStatus,
    dealStatus,
    chooseStatus,
    showHandStatus,
    createGameSoldierStatus,
    createGameKingStatus,
  } = useTransactions({
    contract,
  });

  const createGameStatus = {
    isSuccess:
      createGameKingStatus.isSuccess || createGameSoldierStatus.isSuccess,
    isError: createGameKingStatus.isError || createGameSoldierStatus.isError,
    isLoading:
      createGameKingStatus.isLoading || createGameSoldierStatus.isLoading,
  };

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
    addressIndex: 1,
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
    isStop: gameStatus !== GameStatus.WAITING_FOR_SHOW_HAND,
    others: {
      creator: creator,
      joiner: joiner,
      gameId,
    },
  });

  const gameEndedListenerValues = useEvent({
    contract,
    filter: contract?.filters?.GameEnded(),
    isStop:
      gameStatus !== GameStatus.WAITING_FOR_CHOOSE &&
      gameStatus !== GameStatus.WAITING_FOR_SHOW_HAND &&
      gameStatus !== GameStatus.WAITING_FOR_END,
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
      await sleep(2000);
      const key = await contract?.queryAggregatedPk(gameId, userCardType);
      const aggregatedPk = [key[0].toBigInt(), key[1].toBigInt()];
      const deck1 = await contract?.queryDeck(gameId, 0);
      const [proof1, shuffleData1] = await zkContext?.genShuffleProof(
        babyjub,
        aggregatedPk,
        deck1
      );
      const deck2 = await contract?.queryDeck(gameId, 1);
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
    await sleep(3000);
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

  const handleShowHand = async (cardIndex: number) => {
    try {
      showHandStatus.setIsLoading(true);
      const card = await contract?.queryCardInDeal(
        gameId,
        cardIndex,
        playerType
      );
      const [proof, decryptedData] = await zkContext?.generateShowHandData(
        userPksAndsk?.sk as string,
        userPksAndsk?.pk as string[],
        card
      );
      await showHandStatus.run(gameId, round, proof, [
        decryptedData[0],
        decryptedData[1],
      ]);
    } catch (error) {
      showHandStatus.setIsError(true);
      showHandStatus.setIsLoading(false);
      console.log('error', error);
    } finally {
      showHandStatus.setIsLoading(false);
    }
  };

  // const getWinner =async (creatorCard:CardType,joinerCard:CardType) => {
  //   try {
  //     const winner = await contract?.queryWinner(gameId);
  //     setWinner(winner);
  //   } catch (error) {
  //     console.log('error', error);
  //   }
  // }

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
    if (joinGameListenerValues.joiner?.[1]) {
      setGameStatus(GameStatus.WAITING_FOR_CREATOR_SHUFFLE);
      setJoinerStatus((prev) => {
        return {
          ...prev,
          joinGame: true,
        };
      });
    }
  }, [joinGameListenerValues.joiner?.[1]]);

  useEffect(() => {
    if (shuffleDeckListenerValues.creator?.[1]) {
      if (gameStatus === GameStatus.WAITING_FOR_DEAL) return;
      setGameStatus(GameStatus.WAITING_FOR_JOINER_SHUFFLE);
      setCreatorStatus((prev) => {
        return { ...prev, creatorShuffled: true };
      });
    }
  }, [shuffleDeckListenerValues.creator?.[1]]);

  useEffect(() => {
    const handleCards = async () => {
      await sleep(1000);
      const creatorValues = await getCardInfos(joinerCardType);
      const joinerValues = await getCardInfos(creatorCardType);

      setCreatorCards(creatorValues);
      setJoinerCards(joinerValues);
    };

    if (shuffleDeckListenerValues.joiner?.[1]) {
      handleCards();
      setJoinerStatus((prev) => {
        return { ...prev, joinerShuffled: true };
      });
      setGameStatus(GameStatus.WAITING_FOR_DEAL);
    }
  }, [creatorCardType, joinerCardType, shuffleDeckListenerValues.joiner?.[1]]);

  useEffect(() => {
    if (dealCardListenerValues.creator?.[1]) {
      setCreatorStatus((prev) => {
        return {
          ...prev,
          creatorDealt: true,
        };
      });
    }
  }, [dealCardListenerValues.creator?.[1]]);

  useEffect(() => {
    if (dealCardListenerValues.joiner?.[1]) {
      setJoinerStatus((prev) => {
        return { ...prev, joinerDealt: true };
      });
    }
  }, [dealCardListenerValues.joiner?.[1]]);

  useEffect(() => {
    if (
      dealCardListenerValues.creator?.[1] &&
      dealCardListenerValues.joiner?.[1]
    ) {
      setGameStatus(GameStatus.WAITING_FOR_CHOOSE);
    }
  }, [dealCardListenerValues.creator?.[1], dealCardListenerValues.joiner?.[1]]);

  useEffect(() => {
    if (chooseCardListenerValues.creator?.[1]) {
      const cardIndex = Number(chooseCardListenerValues.creator?.[1]);
      const findCardIndex = creatorCards.findIndex(
        (item) => item.index === cardIndex
      );
      if (findCardIndex > -1) {
        if (creatorCards[findCardIndex].isChoose) return;
        creatorCards[findCardIndex].isChoose = true;
        creatorCards[findCardIndex].round = round;
        setCreatorCards([...creatorCards]);
        setCreatorStatus((prev) => {
          return {
            ...prev,
            creatorChoose: true,
          };
        });
      }
      console.log('creatorCards', creatorCards);
    }
    return () => {};
  }, [chooseCardListenerValues.creator?.[1], creatorCards, round]);

  useEffect(() => {
    if (chooseCardListenerValues.joiner?.[1]) {
      const cardIndex = Number(chooseCardListenerValues.joiner?.[1]);
      const findCardIndex = joinerCards.findIndex(
        (item) => item.index === cardIndex
      );
      if (findCardIndex > -1) {
        if (joinerCards[findCardIndex].isChoose) return;
        joinerCards[findCardIndex].isChoose = true;
        joinerCards[findCardIndex].round = round;
        setJoinerCards([...joinerCards]);
        setJoinerStatus((prev) => {
          return {
            ...prev,
            joinerChoose: true,
          };
        });
      }
    }
  }, [chooseCardListenerValues.joiner?.[1], joinerCards, round]);

  useEffect(() => {
    if (joinerStatus.joinerChoose && creatorStatus.creatorChoose) {
      showHandStatus.reset();
      setGameStatus(GameStatus.WAITING_FOR_SHOW_HAND);
    }
  }, [creatorStatus.creatorChoose, joinerStatus.joinerChoose]);

  useEffect(() => {
    const getHandValue = async () => {
      if (showHandListenerValues.creator?.[1]) {
        const creatorCardValue = Number(showHandListenerValues.creator?.[4]);
        const findCardIndex = creatorCards.findIndex(
          (item) => item.index === Number(showHandListenerValues.creator?.[1])
        );
        if (findCardIndex > -1) {
          if (creatorCards[findCardIndex].isFlipped) return;
          creatorCards[findCardIndex].isFlipped = true;
          creatorCards[findCardIndex].value = Number(creatorCardValue);
          setCreatorCards([...creatorCards]);
          setCreatorStatus((prev) => {
            return {
              ...prev,
              creatorShowHand: true,
            };
          });
          // creatorCards[findCardIndex].isCurrent = true;
        }
      }
    };
    getHandValue();
    return () => {};
  }, [contract, creatorCards, gameId, showHandListenerValues.creator?.[1]]);

  useEffect(() => {
    const getHandValue = async () => {
      if (showHandListenerValues.joiner?.[1]) {
        const joinerCardValue = Number(showHandListenerValues.joiner?.[4]);
        const findCardIndex = joinerCards.findIndex(
          (item) => item.index === Number(showHandListenerValues.joiner?.[1])
        );
        if (findCardIndex > -1) {
          if (joinerCards[findCardIndex].isFlipped) return;
          joinerCards[findCardIndex].isFlipped = true;
          joinerCards[findCardIndex].value = Number(joinerCardValue);
          setJoinerCards([...joinerCards]);
          setJoinerStatus((prev) => {
            return {
              ...prev,
              joinerShowHand: true,
            };
          });
        }
      }
    };
    getHandValue();
    return () => {};
  }, [contract, gameId, joinerCards, showHandListenerValues.joiner?.[1]]);

  useEffect(() => {
    const getHandValue = async () => {
      if (gameStatus === GameStatus.GAME_END) {
        return;
      }
      if (creatorStatus.creatorShowHand && joinerStatus.joinerShowHand) {
        if (round < 5) {
          setRound((prev) => {
            return prev + 1;
          });
          setGameStatus(GameStatus.WAITING_FOR_CHOOSE);
          chooseStatus.reset();
          showHandStatus.reset();
          setJoinerStatus((prev) => {
            return {
              ...prev,
              joinerChoose: false,
              joinerShowHand: false,
            };
          });
          setCreatorStatus((prev) => {
            return {
              ...prev,
              creatorChoose: false,
              creatorShowHand: false,
            };
          });
        } else {
          setGameStatus(GameStatus.WAITING_FOR_END);
        }
      }
    };
    getHandValue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameStatus,
    creatorStatus.creatorShowHand,
    joinerStatus.joinerShowHand,
    round,
  ]);

  useEffect(() => {
    if (gameEndedListenerValues.creator) {
      setWinner(gameEndedListenerValues.creator[1]);
      setGameStatus(GameStatus.GAME_END);
    }

    if (gameEndedListenerValues.joiner) {
      setWinner(gameEndedListenerValues.joiner[1]);
      setGameStatus(GameStatus.GAME_END);
    }
  }, [gameEndedListenerValues.creator, gameEndedListenerValues.joiner]);

  return {
    winner,
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
    showHandStatus,
    round,
    joinerCardType,
    creatorCardType,
    handleShuffle,
    handleGetBabyPk,
    handleGetContracts,
    handleDeal,
    handleShowHand,
  };
}

export default useGame;
