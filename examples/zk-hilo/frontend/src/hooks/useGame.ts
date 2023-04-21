import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getContract } from '@wagmi/core';
import { buildBabyjub } from 'circomlibjs';
import { contracts as contractInfos } from '../const/contracts';
import {
  PlayerContracts,
  PlayerInfos,
  getBabyjub,
  getContracts,
  getPlayerPksAndSks,
} from '../utils/newUtils';
import { Contract, ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { useZKContext } from './useZKContext';

export function useGame() {
  const router = useRouter();
  const { address } = useAccount();
  const [contract, setContract] = useState<Contract>();
  const [playerPksAndSks, setPlayerPksAndSks] = useState<PlayerInfos>();
  const [gameId, setGameId] = useState<number>();
  const [isJoined, setIsJoined] = useState(false);
  const [babyjub, setBabyjub] = useState<any>();
  const zkContext = useZKContext();
  const owner = router?.query?.owner as string;
  const joiner = router?.query?.otherAddress as string;

  const isOwner = owner === address;
  const playerAddresses = [owner, joiner];

  const handleGetBabyPk = async () => {
    try {
      const babyjub = await buildBabyjub();
      console.log('babyjub', babyjub);
      const babyJubs = getBabyjub(babyjub, playerAddresses.length);

      const playerPksAndSks = getPlayerPksAndSks(
        babyJubs,
        playerAddresses as string[]
      );
      console.log('playerPksAndSks', playerPksAndSks);
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
      address: contractInfos.HiLo.address,
      abi: contractInfos.HiLo.abi,
      signerOrProvider: signer,
    });

    setContract(contract);
  };

  const handleQueryAggregatedPk = async () => {
    try {
      const keys = await contract?.queryAggregatedPk(gameId);
      const deck = await contract?.queryDeck(gameId);
      const aggregatedPk = [keys[0].toBigInt(), keys[1].toBigInt()];
      const [solidityProof, comData] = await zkContext?.genShuffleProof(
        babyjub,
        aggregatedPk,
        deck
      );

      if (isOwner) {
        await contract?.shuffle(solidityProof, comData, gameId, {
          gasLimit: 1000000,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleShuffle = async (
    solidityProof: any,
    comData: any,
    gameId: number,
    { gasLimit = 1000000 }: any
  ) => {
    try {
      await contract?.shuffle(solidityProof, comData, gameId, {
        gasLimit: gasLimit,
      });
    } catch (error) {}
  };

  const getGameInfo = async () => {
    try {
      const games = await contract?.['games'](16);
    } catch (error) {}

    // console.log('games', games);
  };

  const handleJoinGame = async () => {
    await contract?.['joinGame'](gameId, [
      playerPksAndSks?.[joiner]?.pk[0],
      playerPksAndSks?.[joiner]?.pk[1],
    ]);
  };

  useEffect(() => {
    if (!router.isReady) return;
    handleGetContracts();
    handleGetBabyPk();
  }, [router.isReady]);

  //   useEffect(() => {
  //     getGameInfo();
  //   }, []);

  useEffect(() => {
    if (!gameId || !isJoined) return;
    handleQueryAggregatedPk();
  }, [gameId, isJoined]);

  useEffect(() => {
    if (!contract || !joiner) return;
    const GameCreatedListener = async (arg1: any, arg2: any, event: any) => {
      try {
        const gameId = Number(arg1);
        const creator = arg2;
        setGameId(gameId);
        if (creator === owner) {
          if (joiner === address) {
            await handleJoinGame();
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
  }, [address, contract, handleJoinGame, joiner, owner, playerPksAndSks]);

  useEffect(() => {
    if (!contract) return;

    const GameJoinedListener = async (arg1: any, arg2: any, event: any) => {
      try {
        const joinerAddress = arg2;
        if (joiner === joinerAddress) {
          setIsJoined(true);
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
    owner,
    joiner,
    address,
    gameId,
    isJoined,
  };
}
