import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { getContract } from '@wagmi/core';
import { buildBabyjub } from 'circomlibjs';
import { contracts as contractInfos } from '../const/contracts';
import { PlayerInfos, getBabyjub, getPlayerPksAndSks } from '../utils/newUtils';
import { Contract, ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { useZKContext } from './useZKContext';
import useDealtListener from './useDealtListener';
import useShowHandListener from './useShowHandListener';
import useShuffledListener from './useShuffledListener';
import useWriteContract from './useWriteContract';
import { sleep } from '../utils/common';

export enum CurrentStatusEnum {
  WAITING_FOR_START = 'waiting for start',
  CREATED_GAME = 'created game',
  WAITING_FOR_JOIN = 'waiting for join',
  WAITING_FOR_CREATOR_SHUFFLE = 'waiting for creator shuffle',
  WAITING_FOR_JOINER_SHUFFLE = 'waiting for joiner shuffle',
  WAITING_FOR_DEAL = 'waiting for deal',
  WAITING_FOR_SHOW = 'waiting for show hand',
  WAITING_FOR_WINNER = 'waiting for winner',
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
  joinerShowHand: -1,
};

export const defaultCreatorStatus = {
  createGame: false,
  creatorShuffled: false,
  creatorDealt: false,
  creatorShowHand: -1,
};

export function useGame() {
  const router = useRouter();
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

  const createGameStatus = useWriteContract(contract?.['createGame'], {
    args: [[userPksAndsk?.pk[0], userPksAndsk?.pk[1]]],
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

  const dealStatus = useWriteContract(contract?.['dealHandCard'], {
    args: [],
    wait: true,
  });

  const showHandStatus = useWriteContract(contract?.['showHand'], {
    args: [],
    wait: true,
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
  const { dealStatus: dealListenerStatus, reset: dealListenerReset } =
    useDealtListener(contract, creator, joiner);
  const { handValues, reset: handValuesReset } = useShowHandListener(
    contract,
    creator,
    joiner
  );
  const { shuffleStatus: shuffleListenerStatus, reset: shuffleReset } =
    useShuffledListener(contract, creator, joiner, address as string);

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
      await sleep(isCreator ? 1000 : 8000);
      const card = await contract?.queryCardInDeal(gameId, showIdx);
      const [showProof, showData] = await zkContext?.generateShowHandData(
        userPksAndsk?.sk as string,
        userPksAndsk?.pk as string[],
        card
      );

      console.log(
        'showHandParams',
        gameId,
        showIdx,
        showProof,
        showData,
        userPksAndsk
      );
      await showHandStatus?.run(
        gameId,
        showIdx,
        showProof,
        [showData[0], showData[1]]
        // { gasLimit: 500000 }
      );
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
      await sleep(isCreator ? 1000 : 8000);
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
        [initDelta[0], initDelta[1]],
        {
          gasLimit: 2000000,
        }
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
    dealListenerReset();
    shuffleReset();
    handValuesReset();
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

  //if both are show hand then get winner
  useEffect(() => {
    if (handValues.creator !== undefined) {
      setCreatorStatus((prev) => ({
        ...prev,
        creatorShowHand: handValues.creator as number,
      }));
    }

    if (handValues.joiner !== undefined) {
      setJoinerStatus((prev) => ({
        ...prev,
        joinerShowHand: handValues.joiner as number,
      }));
    }

    if (handValues.creator !== undefined && handValues.joiner !== undefined) {
      setCurrentStatus(CurrentStatusEnum.WAITING_FOR_WINNER);
      handleGetWinner(handValues.creator, handValues.joiner);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handValues.creator, handValues.joiner]);

  //  if both are finished deal,then show hand
  useEffect(() => {
    if (dealListenerStatus.creator) {
      setCreatorStatus((prev) => ({ ...prev, creatorDealt: true }));
    }
    if (dealListenerStatus.joiner) {
      setJoinerStatus((prev) => ({ ...prev, joinerDealt: true }));
    }
    if (dealListenerStatus.creator && dealListenerStatus.joiner) {
      setCurrentStatus(CurrentStatusEnum.WAITING_FOR_SHOW);
      handleShowCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealListenerStatus.creator, dealListenerStatus.joiner]);

  //if both are finished shuffling, then deal
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (shuffleListenerStatus.creator) {
      setCreatorStatus((prev) => ({ ...prev, creatorShuffled: true }));
      setCurrentStatus(CurrentStatusEnum.WAITING_FOR_JOINER_SHUFFLE);
    }

    if (shuffleListenerStatus.joiner) {
      setJoinerStatus((prev) => ({ ...prev, joinerShuffled: true }));
      setCurrentStatus(CurrentStatusEnum.WAITING_FOR_DEAL);
    }

    if (shuffleListenerStatus.creator && shuffleListenerStatus.joiner) {
      handleDealHandCard();
    }
    return () => {
      timer && clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffleListenerStatus.creator, shuffleListenerStatus.joiner]);

  //  creator goes to shuffle
  useEffect(() => {
    if (!gameId || !joinerStatus.joinGame) return;

    const handleCreatorShuffle = async () => {
      try {
        if (isCreator) {
          await handleShuffle(gameId);
        }
      } catch (error) {}
    };

    handleCreatorShuffle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinerStatus.joinGame, gameId, isCreator]);

  // joiner goes to shuffle
  useEffect(() => {
    if (!gameId || !shuffleListenerStatus.isShouldTriggerJoinerShuffle) return;
    if (shuffleListenerStatus.isShouldTriggerJoinerShuffle) {
      handleShuffle(gameId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, shuffleListenerStatus.isShouldTriggerJoinerShuffle]);

  // game CreateListener
  useEffect(() => {
    const GameCreatedListener = async (arg1: any, arg2: any) => {
      try {
        console.log('GameCreatedListener', arg1, arg2);
        const gameId = Number(arg1);
        const creatorAddress = arg2;
        setCreatorStatus((preStats) => {
          return { ...preStats, createGame: true };
        });
        setCurrentStatus(CurrentStatusEnum.WAITING_FOR_JOIN);
        setGameId(gameId);

        if (creator === creatorAddress) {
          if (joiner === address) {
            await joinGameStatus.run(gameId, [
              userPksAndsk?.pk[0],
              userPksAndsk?.pk[1],
            ]);
          }
        }
      } catch (error) {
        console.log('error', error);
      }
    };

    contract?.on('GameCreated', GameCreatedListener);
    return () => {
      contract?.off('GameCreated', GameCreatedListener);
    };
  }, [address, contract, creator, joinGameStatus, joiner, userPksAndsk?.pk]);

  // game JoinListener
  useEffect(() => {
    if (!contract) return;
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

    contract?.on('GameJoined', GameJoinedListener);
    return () => {
      contract?.off('GameJoined', GameJoinedListener);
    };
  }, [contract, joiner]);
  return {
    playerAddresses,
    contract,
    playerPksAndSks,
    creator,
    joiner,
    address,
    gameId,
    isCreator,
    shuffleListenerStatus,
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

    handleShuffle,
    handleDealHandCard,
    handleShowCard,
    handleReset,
  };
}
