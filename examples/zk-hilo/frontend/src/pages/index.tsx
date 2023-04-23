import { InjectedConnector } from 'wagmi/connectors/injected';

import { useConnect } from 'wagmi';

import React, { useEffect, useMemo } from 'react';
import { useGame } from '../hooks/useGame';
import { useOwnerGame } from '../hooks/useOwnerGame';

import { useResourceContext } from '../hooks/useResourceContext';
import { formatAddress } from '../utils/common';
import Button from '../components/Button';
import StatusItem from '../components/StatusItem';

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

const createDeck = () => {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = Object.keys(CARD_VALUES);
  const deck = suits.flatMap((suit) =>
    values.map((value) => `${suit}${value}`)
  );

  return deck;
};

const deck = createDeck();

export default function Home() {
  const { connect } = useConnect({
    connector: new InjectedConnector(),
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
    address,
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

  return (
    <>
      <div className="flex flex-col min-h-screen bg-slate-900">
        <nav
          className="mt-8 ml-10 relative flex items-center justify-between sm:h-10 lg:justify-start"
          aria-label="Global"
        >
          <div className="items-center flex justify-end sm:flex md:flex md:flex-1 lg:w-0">
            <div className="mr-10">
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

        <div className="flex mt-32  flex-col items-center justify-center text-white gap-10">
          {/* Creator */}
          <div className="flex flex-row gap-20">
            <div className="relative z-10 bg-white rounded-xl shadow-xl ring-1 ring-slate-900/5 dark:bg-slate-800 dark:highlight-white/10">
              <article>
                <h2 className="text-lg font-semibold text-slate-900 pt-4 pb-2 px-4 sm:px-6 lg:px-4 xl:px-6 dark:text-slate-100 transition-opacity duration-[1.5s] delay-500 opacity-25">
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
                    label={'shuffle status:'}
                    statusLabel={'has Shuffled'}
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
                    label={'deal Status:'}
                    statusLabel={'dealt'}
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
                    label={'show Hand:'}
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

            <div className="relative z-10 bg-white rounded-xl shadow-xl ring-1 ring-slate-900/5 dark:bg-slate-800 dark:highlight-white/10">
              <article>
                <h2 className="text-lg font-semibold text-slate-900 pt-4 pb-2 px-4 sm:px-6 lg:px-4 xl:px-6 dark:text-slate-100 transition-opacity duration-[1.5s] delay-500 opacity-25">
                  Joiner Address: {joiner ? formatAddress(joiner) : '--'}
                </h2>
                <dl className="w-96 flex flex-col flex-wrap divide-y divide-slate-200 border-b border-slate-200 text-sm sm:text-base lg:text-sm xl:text-base dark:divide-slate-200/5 dark:border-slate-200/5">
                  <StatusItem
                    label={'Join Status:'}
                    statusLabel={'joined'}
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
          {/* <div className="flex flex-row gap-4">
            <ul className="flex flex-col gap-5 items-start">
              <li className="flex flex-row gap-4 justify-center items-center">
                creator:{creator ? formatAddress(creator) : '--'} -{' '}
                {isCreator ? (
                  <Button
                    isSuccess={createGameStatus.isSuccess}
                    isLoading={createGameStatus.isLoading}
                    isError={createGameStatus.isError}
                    onClick={async () => {
                      await createGameStatus?.run();
                    }}
                  >
                    Start game
                  </Button>
                ) : creatorStatus.createGame ? (
                  'created'
                ) : (
                  'waiting'
                )}
              </li>
              <li className="flex flex-row gap-4 justify-center items-center">
                shffle status:
                {creatorStatus.creatorShuffled ? (
                  'has Shuffled'
                ) : creatorUIStatus.showShuffle ? (
                  <Button
                    isSuccess={shuffleStatus.isSuccess}
                    isLoading={shuffleStatus.isLoading}
                    isError={shuffleStatus.isError}
                    onClick={async () => {
                      await handleShuffle(gameId as number);
                    }}
                  >
                    shuffle
                  </Button>
                ) : (
                  'waiting'
                )}
              </li>
              <li>
                deal:
                {creatorStatus.creatorDealt ? (
                  'dealed'
                ) : creatorUIStatus.showDeal ? (
                  <Button
                    isSuccess={dealStatus.isSuccess}
                    isLoading={dealStatus.isLoading}
                    isError={dealStatus.isError}
                    onClick={async () => {
                      await handleDealHandCard();
                    }}
                  >
                    deal
                  </Button>
                ) : (
                  'waiting'
                )}
              </li>
              <li>
                show Hand:
                {creatorStatus.creatorShowHand > -1 ? (
                  creatorStatus.creatorShowHand
                ) : creatorUIStatus.showHand ? (
                  <Button
                    isSuccess={showHandStatus.isSuccess}
                    isLoading={showHandStatus.isLoading}
                    isError={showHandStatus.isError}
                    onClick={async () => {
                      await handleShowCard();
                    }}
                  >
                    show Hand
                  </Button>
                ) : (
                  'waiting'
                )}
              </li>
            </ul>
            <img className="mb-10 w-32" src="/logo.png" />
            <ul className="flex flex-col gap-5 items-start">
              <li className="flex flex-row gap-4 justify-center items-center">
                Joiner : {joiner ? formatAddress(joiner) : '--'} -{' '}
                {joinerStatus.joinGame ? (
                  'joined'
                ) : joinerUIStatus.showJoin ? (
                  <Button
                    isSuccess={joinGameStatus.isSuccess}
                    isLoading={joinGameStatus.isLoading}
                    isError={joinGameStatus.isError}
                    onClick={async () => {
                      await joinGameStatus?.run(gameId, [
                        userPksAndsk?.pk[0],
                        userPksAndsk?.pk[1],
                      ]);
                    }}
                  >
                    Join game
                  </Button>
                ) : (
                  'waiting'
                )}
              </li>
              <li className="flex flex-row gap-4 justify-center items-center">
                shffle status:
                {joinerStatus.joinerShuffled ? (
                  'has Shuffled'
                ) : joinerUIStatus.showShuffle ? (
                  <Button
                    isSuccess={shuffleStatus.isSuccess}
                    isLoading={shuffleStatus.isLoading}
                    isError={shuffleStatus.isError}
                    onClick={async () => {
                      await handleShuffle(gameId as number);
                    }}
                  >
                    Join game
                  </Button>
                ) : (
                  'waiting'
                )}
              </li>
              <li>
                deal:
                {joinerStatus.joinerDealt ? (
                  'dealed'
                ) : joinerUIStatus.showDeal ? (
                  <Button
                    isSuccess={dealStatus.isSuccess}
                    isLoading={dealStatus.isLoading}
                    isError={dealStatus.isError}
                    onClick={async () => {
                      await handleDealHandCard();
                    }}
                  >
                    deal
                  </Button>
                ) : (
                  'waiting'
                )}
              </li>
              <li>
                show Hand:
                {joinerStatus.joinerShowHand > -1 ? (
                  joinerStatus.joinerShowHand
                ) : joinerUIStatus.showHand ? (
                  <Button
                    isSuccess={showHandStatus.isSuccess}
                    isLoading={showHandStatus.isLoading}
                    isError={showHandStatus.isError}
                    onClick={async () => {
                      await handleShowCard();
                    }}
                  >
                    show Hand
                  </Button>
                ) : (
                  'waiting'
                )}
              </li>
            </ul>
          </div> */}

          {
            <div className="text-xl font-mono font-medium text-sky-500">
              {currentStatus}
            </div>
          }
          {gameId && winner && (
            <div className="text-3xl font-mono font-medium text-sky-500">
              winner is {winner}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
