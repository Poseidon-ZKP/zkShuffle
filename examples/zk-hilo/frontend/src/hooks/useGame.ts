import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { getContract } from '@wagmi/core';
import { buildBabyjub } from 'circomlibjs';
import { contracts as contractInfos } from '../const/contracts';
import { PlayerInfos, getBabyjub, getPlayerPksAndSks } from '../utils/newUtils';
import { Contract, ethers } from 'ethers';
import { useAccount, useProvider } from 'wagmi';
import { useZKContext } from './useZKContext';
import useDealtListener from './useDealtListener';
import useShowHandListener from './useShowHandListener';
import useShuffledListener from './useShuffledListener';
import useWriteContract from './useWriteContract';
import { sleep } from '../utils/common';
import { getLogPrams } from '../utils/contracts';
import useTransactions from './useTransactions';
import useEvent from './useEvent';

export enum CurrentStatusEnum {
  WAITING_FOR_START = 'waiting for start',
  CREATED_GAME = 'created game',
  WAITING_FOR_JOIN = 'waiting for join',
  WAITING_FOR_CREATOR_SHUFFLE = 'waiting for creator shuffle',
  WAITING_FOR_JOINER_SHUFFLE = 'waiting for joiner shuffle',
  WAITING_FOR_DEAL = 'waiting for deal',
  WAITING_FOR_GUESS = 'waiting for guess',
  WAITING_FOR_SHOW = 'waiting for show hand',
  WAITING_FOR_WINNER = 'waiting for winner',
}

export enum SelectionEnum {
  HIGH,
  LOW,
  NONE = -1,
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

export const defaultJoinerStatus = {
  joinGame: false,
  joinerShuffled: false,
  joinerDealt: false,
  joinerGuess: SelectionEnum.NONE,
  joinerShowHand: -1,
};

export const defaultCreatorStatus = {
  createGame: false,
  creatorShuffled: false,
  creatorDealt: false,
  creatorGuess: SelectionEnum.NONE,
  creatorShowHand: -1,
};

export const PULL_DATA_TIME = 2000;

export function useGame() {
  const router = useRouter();
  const provider = useProvider();
  const creator = router?.query?.creator as string;
  const joiner = router?.query?.joiner as string;
  const [currentStatus, setCurrentStatus] = useState<CurrentStatusEnum>(
    CurrentStatusEnum.WAITING_FOR_START
  );

  const { address } = useAccount();
  const [contract, setContract] = useState<Contract>();
  const [playerPksAndSks, setPlayerPksAndSks] = useState<PlayerInfos>();
  const [gameId, setGameId] = useState<number>();
  const [babyjub, setBabyjub] = useState<any>();
  const [winner, setWinner] = useState<string>();

  const [creatorStatus, setCreatorStatus] = useState(defaultCreatorStatus);
  const [joinerStatus, setJoinerStatus] = useState(defaultJoinerStatus);

  // contracts functions

  // const [shuffleListenerStatus, setShuffleStatus] = useState({
  //   creator: false,
  //   joiner: false,
  // });

  const zkContext = useZKContext();

  const handleQueryAggregatedPk = async (gameId: number) => {
    await sleep(8000);
    const keys = await contract?.queryAggregatedPk(gameId);
    const deck = await contract?.queryDeck(gameId);
    const aggregatedPk = [keys[0].toBigInt(), keys[1].toBigInt()];
    const data = await zkContext?.genShuffleProof(babyjub, aggregatedPk, deck);
    return data;
  };

  const isCreator = creator === address;
  const cardIdx = isCreator ? 0 : 1;
  const showIdx = isCreator ? 1 : 0;
  const playerAddresses = [creator, joiner];
  const userPksAndsk = playerPksAndSks?.[address as string];

  const {
    createGameStatus,
    showHandStatus,
    dealStatus,
    shuffleStatus,
    joinGameStatus,
    guessStatus,
  } = useTransactions({
    contract,
  });

  const handleShuffle = async (gameId: number) => {
    try {
      shuffleStatus.setIsLoading(true);
      const [solidityProof, comData] = await handleQueryAggregatedPk(gameId);
      let res = await shuffleStatus.run(solidityProof, comData, gameId);

      return res;
    } catch (error) {
      console.log('error', error);
      shuffleStatus.setIsSuccess(false);
      shuffleStatus.setIsError(true);
    } finally {
      shuffleStatus.setIsLoading(false);
    }
  };

  //listeners

  const createGameListenerValues = useEvent({
    contract,
    filter: contract?.filters?.GameCreated(),
    isStop: currentStatus !== CurrentStatusEnum.WAITING_FOR_START,
    addressIndex: 1,

    others: {
      creator: creator,
      joiner: joiner,
    },
  });

  const joinGameListenerValues = useEvent({
    contract,
    filter: contract?.filters?.GameJoined(),
    isStop: currentStatus !== CurrentStatusEnum.WAITING_FOR_JOIN,
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
    isStop:
      currentStatus !== CurrentStatusEnum.WAITING_FOR_CREATOR_SHUFFLE &&
      currentStatus !== CurrentStatusEnum.WAITING_FOR_JOINER_SHUFFLE,
    addressIndex: 1,

    others: {
      creator: creator,
      joiner: joiner,
      gameId,
    },
  });

  const dealListenerStatus = useEvent({
    contract,
    filter: contract?.filters?.DealCard(),
    isStop: currentStatus !== CurrentStatusEnum.WAITING_FOR_DEAL,
    addressIndex: 2,
    others: {
      creator: creator,
      joiner: joiner,
      gameId,
    },
  });

  const guessListenerStatus = useEvent({
    contract,
    filter: contract?.filters?.Guess(),
    isStop: currentStatus !== CurrentStatusEnum.WAITING_FOR_GUESS,
    addressIndex: 2,
    others: {
      creator: creator,
      joiner: joiner,
      gameId,
    },
  });

  const showHandListenerStatus = useEvent({
    contract,
    filter: contract?.filters?.ShowCard(),
    isStop: currentStatus !== CurrentStatusEnum.WAITING_FOR_GUESS,
    addressIndex: 3,
    others: {
      creator: creator,
      joiner: joiner,
      gameId,
    },
  });

  const { handValues, reset: handValuesReset } = useShowHandListener(
    contract,
    provider,
    currentStatus,
    creator,
    joiner
  );

  const handleGetWinner = (creatorValue: number, joinerValue: number) => {
    let winner = creatorValue > joinerValue ? creator : joiner;
    setWinner(winner);
  };

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
      address: contractInfos?.HiLo?.address,
      abi: contractInfos?.HiLo?.abi,
      signerOrProvider: signer,
    });
    setContract(contract);
  };

  const handleShowCard = async () => {
    try {
      showHandStatus.setIsLoading(true);
      await sleep(isCreator ? 2000 : 6000);

      const card = await contract?.queryCardInDeal(gameId, showIdx);
      console.log('gameId', gameId);
      console.log('showIdx', showIdx);
      console.log('card', card);

      const [showProof, showData] = await zkContext?.generateShowHandData(
        userPksAndsk?.sk as string,
        userPksAndsk?.pk as string[],
        card
      );

      await showHandStatus?.run(gameId, showIdx, showProof, [
        showData[0],
        showData[1],
      ]);
    } catch (error) {
      showHandStatus.setIsError(true);
      showHandStatus.setIsLoading(false);
    } finally {
      showHandStatus.setIsLoading(false);
    }
  };
  const handleDealHandCard = async () => {
    try {
      dealStatus.setIsLoading(true);
      await sleep(2000);
      const card = await contract?.queryCardFromDeck(gameId, cardIdx);
      const [dealProof, decryptedData, initDelta] =
        await zkContext?.generateDealData(
          cardIdx,
          playerPksAndSks?.[address as string]?.sk as string,
          playerPksAndSks?.[address as string]?.pk as string[],
          card
        );
      await dealStatus?.run(
        gameId,
        cardIdx,
        dealProof,
        [decryptedData[0], decryptedData[1]],
        [initDelta[0], initDelta[1]]
      );
    } catch (error) {
      dealStatus.setIsSuccess(false);
      dealStatus.setIsError(true);
      console.log('error', error);
    } finally {
      dealStatus.setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCreatorStatus(defaultCreatorStatus);
    setJoinerStatus(defaultJoinerStatus);
    setGameId(undefined);
    setCurrentStatus(CurrentStatusEnum.CREATED_GAME);
    setWinner(undefined);
    // dealListenerReset();
    // handValuesReset();
    createGameStatus.reset();
    joinGameStatus.reset();
    shuffleStatus.reset();
    dealStatus.reset();
    showHandStatus.reset();
  };

  useEffect(() => {
    if (!router.isReady) return;
    handleGetContracts();
    handleGetBabyPk();
  }, [router.isReady]);

  // create game handler
  useEffect(() => {
    const GameCreatedListener = async (arg1: any, arg2: any) => {
      try {
        const gameId = Number(arg1);
        const creatorAddress = arg2;
        setCreatorStatus((preStats) => {
          return { ...preStats, createGame: true };
        });
        setCurrentStatus(CurrentStatusEnum.WAITING_FOR_JOIN);
        setGameId(gameId);

        if (creator === creatorAddress) {
          if (joiner === address) {
            // await joinGameStatus.run(gameId, [
            //   userPksAndsk?.pk[0],
            //   userPksAndsk?.pk[1],
            // ]);
          }
        }
      } catch (error) {
        console.log('error', error);
      }
    };

    if (createGameListenerValues.creator) {
      GameCreatedListener(
        createGameListenerValues.creator[0],
        createGameListenerValues.creator[1]
      );
    }

    return () => {};
  }, [createGameListenerValues.creator]);

  // join game handler
  useEffect(() => {
    const GameJoinedListener = async (arg1: any, joinerAddress: any) => {
      try {
        if (joiner === joinerAddress) {
          setJoinerStatus((preStats) => {
            return { ...preStats, joinGame: true };
          });
          setCurrentStatus(CurrentStatusEnum.WAITING_FOR_CREATOR_SHUFFLE);
          // setIsJoined(true);
        }
      } catch (error) {}
    };
    if (joinGameListenerValues.joiner) {
      GameJoinedListener(
        joinGameListenerValues.joiner[0],
        joinGameListenerValues.joiner[1]
      );
    }
  }, [joinGameListenerValues.joiner]);

  // shuffle handler
  useEffect(() => {
    const handleShuffleHandler = () => {
      if (shuffleDeckListenerValues.creator) {
        setCreatorStatus((prev) => ({
          ...prev,
          creatorShuffle: true,
        }));
        setCurrentStatus(CurrentStatusEnum.WAITING_FOR_JOINER_SHUFFLE);
      }

      if (shuffleDeckListenerValues.joiner) {
        setJoinerStatus((prev) => ({
          ...prev,
          joinerShuffle: true,
        }));
        setCurrentStatus(CurrentStatusEnum.WAITING_FOR_DEAL);
      }
    };

    handleShuffleHandler();
  }, [shuffleDeckListenerValues.creator, shuffleDeckListenerValues.joiner]);

  //  deal handler
  useEffect(() => {
    if (dealListenerStatus.creator) {
      setCreatorStatus((prev) => ({ ...prev, creatorDealt: true }));
    }
    if (dealListenerStatus.joiner) {
      setJoinerStatus((prev) => ({ ...prev, joinerDealt: true }));
    }
    if (dealListenerStatus.creator && dealListenerStatus.joiner) {
      setCurrentStatus(CurrentStatusEnum.WAITING_FOR_GUESS);
      // handleShowCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealListenerStatus.creator, dealListenerStatus.joiner, showIdx]);

  // guess handler
  useEffect(() => {
    if (guessListenerStatus.creator) {
      setCreatorStatus((prev) => ({
        ...prev,
        creatorGuess: guessListenerStatus.creator[1],
      }));
    }
    if (guessListenerStatus.joiner) {
      setJoinerStatus((prev) => ({
        ...prev,
        joinerGuess: guessListenerStatus.joiner[1],
      }));
    }
    if (dealListenerStatus.creator && dealListenerStatus.joiner) {
      setCurrentStatus(CurrentStatusEnum.WAITING_FOR_SHOW);
      // handleShowCard();
    }

    return () => {};
  }, [guessListenerStatus.creator, guessListenerStatus.joiner]);

  // show handler
  useEffect(() => {
    if (showHandListenerStatus.creator) {
      setCreatorStatus((prev) => ({
        ...prev,
        creatorShowHand: showHandListenerStatus.creator?.[2] as number,
      }));
    }

    if (showHandListenerStatus.joiner) {
      setJoinerStatus((prev) => ({
        ...prev,
        joinerShowHand: showHandListenerStatus.joiner?.[2] as number,
      }));
    }

    if (showHandListenerStatus.creator && showHandListenerStatus.joiner) {
      setCurrentStatus(CurrentStatusEnum.WAITING_FOR_WINNER);
      handleGetWinner(
        showHandListenerStatus.creator?.[2],
        showHandListenerStatus.joiner?.[2]
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHandListenerStatus.creator, showHandListenerStatus.joiner]);

  return {
    playerAddresses,
    contract,
    playerPksAndSks,
    creator,
    joiner,
    address,
    gameId,
    isCreator,
    // dealListenerStatus,
    dealStatus,
    handValues,
    winner,
    createGameStatus,
    creatorStatus,
    joinerStatus,
    joinGameStatus,
    currentStatus,
    userPksAndsk,
    shuffleStatus,
    showHandStatus,
    guessStatus,
    handleShuffle,
    handleDealHandCard,
    handleShowCard,
    handleReset,
  };
}
