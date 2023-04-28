import { InjectedConnector } from 'wagmi/connectors/injected';
import { useAccount, useConnect, useNetwork, useSwitchNetwork } from 'wagmi';
import ReactCardFlip from 'react-card-flip';
import { arbitrumGoerli } from 'wagmi/chains';

import React, { useEffect, useMemo, useState } from 'react';

import { useResourceContext } from '../hooks/useResourceContext';
import { useRouter } from 'next/router';
import { formatAddress } from '../utils/common';
import Card from '../components/Card';
import useGame, { CardType, GameStatus } from '../hooks/useGame';
import Button from '../components/Button';

const CARD_VALUES: Record<string, number> = {
  A: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  J: 11,
  Q: 12,
  K: 13,
};

export const createDeck = () => {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = Object.keys(CARD_VALUES);
  const deck = suits.flatMap((suit) =>
    values.map((value) => `${suit}${value}`)
  );

  return deck;
};

const deck = createDeck();

export default function Home() {
  const router = useRouter();
  const creator = router?.query?.creator as string;
  const joiner = router?.query?.joiner as string;

  const { connect, connectors } = useConnect();

  const { chain } = useNetwork();
  const { address } = useAccount();
  const { error, isLoading, pendingChainId, switchNetwork } = useSwitchNetwork({
    chainId: arbitrumGoerli.id,
  });

  const resourceContext = useResourceContext();
  if (!resourceContext) {
    throw new Error('resource context is not ready');
  }
  const { hasSetup, settingUp, setupBeforeJoin } = resourceContext;

  const {
    isCreator,
    gameStatus,
    gameId,
    createGameKingStatus,
    createGameSoldierStatus,
    creatorStatus,
    userPksAndsk,
    userCardType,
    joinerStatus,
    joinGameStatus,
    shuffleStatus,
    createGameStatus,
    handleGetBabyPk,
    handleGetContracts,
    handleShuffle,
  } = useGame({
    address: address,
    creator: creator,
    joiner: joiner,
  });

  // const creatorUIState = useMemo(() => {
  //   return {
  //     showStartGame: isCreator && !creatorStatus.createGame,
  //   };
  // }, [creatorStatus.createGame, isCreator]);

  const joinerUIState = useMemo(() => {
    return {
      showJoinGame: !isCreator && !joinerStatus.joinGame,
    };
  }, [isCreator, joinerStatus.joinGame]);

  useEffect(() => {
    if (hasSetup || settingUp) {
      return;
    }
    console.log('set up before join');
    setupBeforeJoin();
  }, [hasSetup, settingUp, setupBeforeJoin]);

  useEffect(() => {
    if (!router.isReady) return;
    handleGetContracts();
    handleGetBabyPk();
  }, [router.isReady]);

  const CreatorGameAreaUI = () => {
    return (
      <>
        {!creatorStatus.createGame && (
          <div className="flex flex-col justify-center items-center gap-20">
            <div>I want to become</div>
            <div className="flex  gap-6">
              <Button
                isSuccess={createGameKingStatus.isSuccess}
                isError={createGameKingStatus.isError}
                isLoading={createGameKingStatus.isLoading}
                onClick={() => {
                  createGameKingStatus.run(
                    [userPksAndsk?.pk[0], userPksAndsk?.pk[1]],
                    CardType.KING
                  );
                }}
              >
                KING
              </Button>
              <Button
                isSuccess={createGameSoldierStatus.isSuccess}
                isError={createGameSoldierStatus.isError}
                isLoading={createGameSoldierStatus.isLoading}
                onClick={() => {
                  createGameSoldierStatus.run(
                    [userPksAndsk?.pk[0], userPksAndsk?.pk[1]],
                    CardType.SOLDIER
                  );
                }}
              >
                SOLDIER
              </Button>
            </div>
          </div>
        )}
        {creatorStatus.createGame && (
          <div className="flex flex-col justify-center items-center gap-20">
            {joinerStatus.joinGame ? (
              <div className="flex  gap-6">
                {' '}
                <Button
                  isSuccess={shuffleStatus.isSuccess}
                  isError={shuffleStatus.isError}
                  isLoading={shuffleStatus.isLoading}
                  onClick={() => {
                    handleShuffle();
                  }}
                >
                  shuffle
                </Button>{' '}
              </div>
            ) : (
              'Waiting'
            )}
          </div>
        )}
      </>
    );
  };

  const JoinerGameAreaUI = () => {
    return (
      <>
        {!joinerStatus.joinGame && (
          <div className="flex flex-col justify-center items-center gap-20">
            {creatorStatus.createGame ? (
              <Button
                isSuccess={joinGameStatus.isSuccess}
                isError={joinGameStatus.isError}
                isLoading={joinGameStatus.isLoading}
                onClick={() => {
                  joinGameStatus.run(gameId, [
                    userPksAndsk?.pk[0],
                    userPksAndsk?.pk[1],
                  ]);
                }}
              >
                JOIN
              </Button>
            ) : (
              ' Waiting for creator creating game'
            )}
          </div>
        )}
        {joinerStatus.joinGame && (
          <div className="flex flex-col justify-center items-center gap-20">
            {creatorStatus.creatorShuffled ? (
              <div className="flex  gap-6">
                <Button
                  isSuccess={shuffleStatus.isSuccess}
                  isError={shuffleStatus.isError}
                  isLoading={shuffleStatus.isLoading}
                  onClick={() => {
                    handleShuffle();
                  }}
                >
                  shuffle
                </Button>
              </div>
            ) : (
              'Waiting for creator shuffle'
            )}
          </div>
        )}
      </>
    );
  };

  console.log('joinerUIState', joinerUIState);
  if (!router.isReady) {
    return (
      <div className=" flex flex-col gap-10  h-screen items-center justify-center  text-2xl font-medium bg-slate-900 ">
        <div className="text-2xl font-medium">Loading resource...</div>
      </div>
    );
  }
  if (!creator || !joiner) {
    return (
      <div className=" flex flex-col gap-10  h-screen items-center justify-center  text-2xl font-medium bg-slate-900 ">
        <div className="text-2xl font-medium">Don't find creator or joiner</div>
        <div className="text-2xl font-medium text-pink-500">
          Please add them on URL
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className=" flex flex-col gap-10  h-screen items-center justify-center  text-2xl font-medium bg-slate-900 ">
        <div className="text-2xl font-medium">please connect wallet first</div>
        <div
          onClick={() => {
            connect({
              connector: connectors[0],
            });
          }}
          className="px-6 py-2 hover:opacity-70 text-base font-medium rounded-lg bg-slate-100 text-slate-900  text-center cursor-pointer dark:bg-slate-600 dark:text-slate-400 dark:highlight-white/10"
        >
          connect wallet
        </div>
      </div>
    );
  }

  if (chain?.id !== arbitrumGoerli.id) {
    return (
      <div className=" flex flex-col gap-10  h-screen items-center justify-center  text-2xl font-medium bg-slate-900 ">
        <div className="text-2xl font-medium">
          Only support Arbitrum Goerli test network now
        </div>
        <div
          onClick={() => {
            try {
              switchNetwork?.();
            } catch (error) {
              console.log(error);
            }
          }}
          className="px-6 py-2 text-base font-medium rounded-lg bg-slate-100 text-slate-900  text-center cursor-pointer dark:bg-slate-600 dark:text-slate-400 dark:highlight-white/10 hover:opacity-70"
        >
          Switch to Arbitrum Goerli test
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative flex flex-col justify-center  items-center min-h-screen bg-slate-900">
        <nav
          className="absolute right-10 top-10  flex items-center justify-between sm:h-10 lg:justify-start"
          aria-label="Global"
        >
          <div className="items-center flex justify-end sm:flex md:flex md:flex-1 ">
            <div>
              {address ? (
                <p>{address}</p>
              ) : (
                <div
                  onClick={() => {
                    connect();
                  }}
                >
                  connect Wallet
                </div>
              )}
            </div>
          </div>
        </nav>
        <div className="flex flex-col  w-[82rem] h-[48rem]  bg-slate-800 shadow group rounded-2xl">
          {/* Creator */}
          <ul className="p-8">
            <li> Address:{formatAddress(creator)} </li>
            <li>
              Current Status:{gameId ? `gameId ${gameId}` : 'Not Created'}
            </li>
          </ul>

          {/* GameArea */}
          <div className="p-4 flex flex-col justify-center items-center gap-10 flex-1 border-t border-b border-slate-700  ">
            {isCreator ? <CreatorGameAreaUI /> : <JoinerGameAreaUI />}
            {/* <>
              <div className="w-full flex justify-between">
                <Card
                  onClickFrond={() => {
                    setIsFlid(true);
                  }}
                  isFlipped={isFlid}
                  cardValue={deck[2]}
                />
                <Card isFlipped={false} />
                <Card isFlipped={false} />
                <Card isFlipped={false} />
                <Card isFlipped={false} />
              </div>

              <div className="w-full flex justify-between">
                <Card isFlipped={false} />
                <Card isFlipped={false} />
                <Card isFlipped={false} />
                <Card isFlipped={false} />
                <Card isFlipped={false} />
              </div>
            </> */}
          </div>
          {/* Joiner */}
          <ul className="p-8">
            <li>Joiner Address:{formatAddress(joiner)}</li>
            <li>Current Status:Not Created</li>
          </ul>
        </div>
      </div>
    </>
  );
}
