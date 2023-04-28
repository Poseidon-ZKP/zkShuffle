import { useAccount, useConnect, useNetwork, useSwitchNetwork } from 'wagmi';
import React, { useEffect, useMemo } from 'react';
import { useGame } from '../hooks/useGame';

import { useResourceContext } from '../hooks/useResourceContext';
import { formatAddress } from '../utils/common';
import StatusItem from '../components/StatusItem';
import { useRouter } from 'next/router';
import { arbitrumGoerli } from 'wagmi/chains';

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

export default function Home() {
  const { connect, connectors } = useConnect();

  const router = useRouter();
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

  useEffect(() => {
    if (hasSetup || settingUp) {
      return;
    }
    console.log('set up before join');
    setupBeforeJoin();
  }, [hasSetup, settingUp, setupBeforeJoin]);

  const {
    creator,
    joiner,
    gameId,
    isCreator,
    winner,
    createGameStatus,
    joinGameStatus,
    creatorStatus,
    joinerStatus,
    currentStatus,
    shuffleStatus,
    userPksAndsk,
    dealStatus,
    showHandStatus,
    handleShuffle,
    handleDealHandCard,
    handleShowCard,
    handleReset,
  } = useGame();

  const creatorUIStatus = useMemo(() => {
    return {
      showStart: isCreator && !creatorStatus.createGame,
      showShuffle:
        isCreator && creatorStatus.createGame && joinerStatus.joinGame,
      showDeal:
        isCreator &&
        joinerStatus.joinerShuffled &&
        creatorStatus.creatorShuffled,
      showHand:
        isCreator && joinerStatus.joinerDealt && creatorStatus.creatorDealt,
    };
  }, [
    creatorStatus.createGame,
    creatorStatus.creatorDealt,
    creatorStatus.creatorShuffled,
    isCreator,
    joinerStatus.joinGame,
    joinerStatus.joinerDealt,
    joinerStatus.joinerShuffled,
  ]);

  const joinerUIStatus = useMemo(() => {
    return {
      showJoin: !isCreator && creatorStatus.createGame,
      showShuffle: !isCreator && creatorStatus.creatorShuffled,
      showDeal:
        !isCreator &&
        joinerStatus.joinerShuffled &&
        creatorStatus.creatorShuffled,
      showHand:
        !isCreator && joinerStatus.joinerDealt && creatorStatus.creatorDealt,
    };
  }, [
    creatorStatus.createGame,
    creatorStatus.creatorDealt,
    creatorStatus.creatorShuffled,
    isCreator,
    joinerStatus.joinerDealt,
    joinerStatus.joinerShuffled,
  ]);

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
      <div className="relative flex flex-col h-screen bg-slate-900">
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

              {/* <ConnectButton /> */}
            </div>
          </div>
        </nav>

        {address && (
          <div className="h-full flex flex-col items-center justify-center text-white gap-10">
            {/* Creator */}
            <div className="flex flex-row gap-20">
              <div className="relative z-10 bg-white rounded-xl shadow-xl  bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 dark:highlight-white/10">
                <article>
                  <h2 className="text-lg font-semibold text-slate-900 pt-4 pb-2 px-4 sm:px-6 lg:px-4 xl:px-6 dark:text-slate-100 transition-opacity duration-[1.5s] delay-500 ">
                    Creator Address:{creator ? formatAddress(creator) : '--'}
                  </h2>
                  <dl className="w-96 flex flex-col flex-wrap divide-y divide-slate-200 border-b border-slate-200 text-sm sm:text-base lg:text-sm xl:text-base dark:divide-slate-200/5 dark:border-slate-200/5">
                    <StatusItem
                      label={'Create Status:'}
                      statusLabel={'Created'}
                      isShowText={creatorStatus.createGame}
                      uiStatus={creatorUIStatus.showStart}
                      buttonStatus={createGameStatus}
                      buttonProps={{
                        onClick: async () => {
                          await createGameStatus?.run();
                        },
                        children: 'Start game',
                      }}
                    />

                    <StatusItem
                      label={'Shuffle status:'}
                      statusLabel={'Shuffled'}
                      isShowText={creatorStatus.creatorShuffled}
                      uiStatus={creatorUIStatus.showShuffle}
                      buttonStatus={shuffleStatus}
                      buttonProps={{
                        onClick: async () => {
                          await handleShuffle(gameId as number);
                        },
                        children: 'Shuffle',
                      }}
                    />
                    <StatusItem
                      label={'Deal Status:'}
                      statusLabel={'Dealt'}
                      isShowText={creatorStatus.creatorDealt}
                      uiStatus={creatorUIStatus.showDeal}
                      buttonStatus={dealStatus}
                      buttonProps={{
                        onClick: async () => {
                          await handleDealHandCard();
                        },
                        children: 'Deal',
                      }}
                    />
                    <StatusItem
                      label={'Show Hand:'}
                      statusLabel={String(creatorStatus.creatorShowHand)}
                      isShowText={creatorStatus.creatorShowHand > -1}
                      uiStatus={creatorUIStatus.showHand}
                      buttonStatus={showHandStatus}
                      buttonProps={{
                        onClick: async () => {
                          await handleShowCard();
                        },
                        children: 'Show Hand',
                      }}
                    />
                  </dl>
                  {/* <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 lg:gap-x-4 xl:gap-x-6 p-4 sm:px-6 sm:py-5 lg:p-4 xl:px-6 xl:py-5">
                  <div className="text-base font-medium rounded-lg bg-slate-100 text-slate-900 py-3 text-center cursor-pointer dark:bg-slate-600 dark:text-slate-400 dark:highlight-white/10">
                    Decline
                  </div>
                  <div className="text-base font-medium rounded-lg bg-sky-500 text-white py-3 text-center cursor-pointer dark:highlight-white/20">
                    Accept
                  </div>
                </div> */}
                </article>
              </div>

              <div className="relative z-10 bg-white rounded-xl shadow-xl ring-1 ring-slate-900/5 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 dark:highlight-white/10">
                <article>
                  <h2 className="text-lg font-semibold text-slate-900 pt-4 pb-2 px-4 sm:px-6 lg:px-4 xl:px-6 dark:text-slate-100 transition-opacity duration-[1.5s] delay-500 ">
                    Joiner Address: {joiner ? formatAddress(joiner) : '--'}
                  </h2>
                  <dl className="w-96 flex flex-col flex-wrap divide-y divide-slate-200 border-b border-slate-200 text-sm sm:text-base lg:text-sm xl:text-base dark:divide-slate-200/5 dark:border-slate-200/5">
                    <StatusItem
                      label={'Join Status:'}
                      statusLabel={'Joined'}
                      isShowText={joinerStatus.joinGame}
                      uiStatus={joinerUIStatus.showJoin}
                      buttonStatus={joinGameStatus}
                      buttonProps={{
                        onClick: async () => {
                          await joinGameStatus?.run(gameId, [
                            userPksAndsk?.pk[0],
                            userPksAndsk?.pk[1],
                          ]);
                        },
                        children: 'Join game',
                      }}
                    />
                    <StatusItem
                      label={'Shuffle status:'}
                      statusLabel={'Shuffled'}
                      isShowText={joinerStatus.joinerShuffled}
                      uiStatus={joinerUIStatus.showShuffle}
                      buttonStatus={shuffleStatus}
                      buttonProps={{
                        onClick: async () => {
                          await handleShuffle(gameId as number);
                        },
                        children: 'Shuffle',
                      }}
                    />
                    <StatusItem
                      label={'Deal Status:'}
                      statusLabel={'Dealt'}
                      isShowText={joinerStatus.joinerDealt}
                      uiStatus={joinerUIStatus.showDeal}
                      buttonStatus={dealStatus}
                      buttonProps={{
                        onClick: async () => {
                          await handleDealHandCard();
                        },
                        children: 'Deal',
                      }}
                    />
                    <StatusItem
                      label={'Show Hand:'}
                      statusLabel={String(joinerStatus.joinerShowHand)}
                      isShowText={joinerStatus.joinerShowHand > -1}
                      uiStatus={joinerUIStatus.showHand}
                      buttonStatus={showHandStatus}
                      buttonProps={{
                        onClick: async () => {
                          await handleShowCard();
                        },
                        children: 'Show Hand',
                      }}
                    />
                  </dl>
                  {/* <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 lg:gap-x-4 xl:gap-x-6 p-4 sm:px-6 sm:py-5 lg:p-4 xl:px-6 xl:py-5">
                  <div className="text-base font-medium rounded-lg bg-slate-100 text-slate-900 py-3 text-center cursor-pointer dark:bg-slate-600 dark:text-slate-400 dark:highlight-white/10">
                    Decline
                  </div>
                  <div className="text-base font-medium rounded-lg bg-sky-500 text-white py-3 text-center cursor-pointer dark:highlight-white/20">
                    Accept
                  </div>
                </div> */}
                </article>
              </div>
            </div>

            {
              <div className="text-xl font-mono font-medium text-sky-500">
                {currentStatus}
              </div>
            }
            {gameId && (
              <div className="flex flex-col items-center justify-center">
                Current game Id:{gameId}
              </div>
            )}
            {gameId && winner && (
              <div className="flex flex-col items-center justify-center">
                <div className="text-3xl font-mono font-medium text-sky-500">
                  winner is {winner}
                </div>
                {/* <Button onClick={handleReset}>Try again</Button> */}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
