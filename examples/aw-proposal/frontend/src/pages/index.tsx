import { useAccount, useConnect, useNetwork, useSwitchNetwork } from 'wagmi';
import { arbitrumGoerli } from 'wagmi/chains';

import React, { useEffect } from 'react';

import { useResourceContext } from '../hooks/useResourceContext';
import { useRouter } from 'next/router';

import useGame, { Card as CardInt } from '../hooks/useGame';
import usePlayer, {
  PlayerInfo,
  PlayerType,
  UsePlayerReturn,
} from '../hooks/usePlayer';
import Card from '../components/Card';
import Button from '../components/Button';
import { handleDealsOfWaitCards, handleWait, replaceCard } from '../utils/game';

export default function Home() {
  const router = useRouter();
  const creator = router?.query?.creator as string;
  const joiner = router?.query?.joiner as string;

  const { connect, connectors } = useConnect();

  const { chain } = useNetwork();
  const { address } = useAccount();
  const { switchNetwork } = useSwitchNetwork({
    chainId: arbitrumGoerli.id,
  });

  const resourceContext = useResourceContext();
  if (!resourceContext) {
    throw new Error('resource context is not ready');
  }
  const { hasSetup, settingUp, setupBeforeJoin } = resourceContext;

  const { cardDecks, turn, handleNextTurn } = useGame();
  const creatorPlayer = usePlayer({ userType: PlayerType.CREATOR });
  const joinerPlayer = usePlayer({ userType: PlayerType.JOINER });

  // const crawCard = (player: PlayerInfo, deckIdx: number) => {
  //   const newDeck = [...player.deck];
  //   const newHand = [...player.hand];
  //   const card = newDeck.splice(deckIdx, 1)[0];
  //   newHand.push(card);
  // };

  const hadActionCreatorHands = creatorPlayer.player.hand.filter(
    (item) => item.isCanAttack === false
  );
  const hadActionJoinerHands = joinerPlayer.player.hand.filter(
    (item) => item.isCanAttack === false
  );
  console.log('hadActionCreatorHands', hadActionCreatorHands);
  console.log('hadActionJoinerHands', hadActionJoinerHands);
  const isShouldNextTurn =
    hadActionCreatorHands.length === hadActionJoinerHands.length &&
    hadActionJoinerHands.length === turn;

  console.log('isShouldNextTurn', isShouldNextTurn);

  const attackCard = (
    currentPlayer: UsePlayerReturn,
    cardId: number,
    targetId: number
  ) => {
    const targetPlayer =
      currentPlayer.player.userType === PlayerType.CREATOR
        ? joinerPlayer
        : creatorPlayer;
    const selectCardIndex = currentPlayer.player.hand.findIndex(
      (item) => item.id === cardId
    );

    const targetCardIndex = targetPlayer.player.hand.findIndex(
      (item) => item.id === targetId
    );

    const selectCard = currentPlayer.player.hand[selectCardIndex];
    const targetCard = targetPlayer.player.hand[targetCardIndex];
    selectCard.isCanAttack = false;
    if (selectCardIndex > -1 && targetCardIndex > -1) {
      const newTargetPlayer = replaceCard(
        targetPlayer.player,
        selectCard,
        targetCard,
        targetCardIndex
      );
      const newPlayer = replaceCard(
        currentPlayer.player,
        targetCard,
        selectCard,
        selectCardIndex
      );
      currentPlayer.setPlayer((prev) => {
        return {
          ...prev,
          player: newPlayer,
        };
      });
      targetPlayer.setPlayer((prev) => {
        return {
          ...prev,
          player: newTargetPlayer,
        };
      });
    } else {
      // targetPlayer.hp -= card.attack;
      // setPlayer1({ ...player1 });
      // setPlayer2({ ...player2 });
    }
  };

  useEffect(() => {
    if (hasSetup || settingUp) {
      return;
    }
    console.log('set up before join');
    setupBeforeJoin();
  }, [hasSetup, settingUp, setupBeforeJoin]);

  useEffect(() => {
    if (!router.isReady) return;
  }, [router.isReady]);

  // attack
  useEffect(() => {
    if (creatorPlayer.currentCard && joinerPlayer.currentCard) {
      attackCard(
        creatorPlayer,
        creatorPlayer.currentCard,
        joinerPlayer.currentCard
      );
      creatorPlayer.setCurrentCard(undefined);
      joinerPlayer.setCurrentCard(undefined);
    }
  }, [
    creatorPlayer.currentCard,
    creatorPlayer.player,
    joinerPlayer.currentCard,
  ]);

  //  handle turn
  useEffect(() => {
    if (turn === 1) return;
    const creatorHands = handleWait(creatorPlayer.player.hand);
    const joinerHands = handleWait(joinerPlayer.player.hand);

    creatorPlayer.setPlayer((prev) => {
      return {
        ...prev,
        hand: creatorHands,
        deals: [],
      };
    });
    joinerPlayer.setPlayer((prev) => {
      return {
        ...prev,
        deals: [],
        hand: joinerHands,
      };
    });
  }, [turn]);

  console.log(creatorPlayer.player);
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
        <div className="flex flex-col p-4  w-[87rem]   h-[54rem]  bg-slate-800 shadow group rounded-2xl">
          {/* creator */}
          <div className="flex flex-1 flex-col-reverse justify-between">
            <div className="flex gap-2">
              {(creatorPlayer?.player?.hand || []).map((item, index, hand) => (
                <Card
                  isChoose={creatorPlayer.currentCard == item.id}
                  onClickBack={() => {
                    creatorPlayer.setCurrentCard(
                      creatorPlayer.currentCard === item.id
                        ? undefined
                        : item.id
                    );
                  }}
                  isDisabled={!item.isCanAttack}
                  key={item.id}
                  isFlipped={true}
                  cardValue={item}
                />
              ))}
              {/* {renderHand(creatorPlayer?.player?.hand)} */}
            </div>
            <div className=" h-px  flex-1"></div>
            <div className="flex gap-2">
              {(creatorPlayer?.player?.deck || []).map((item, index) => (
                <Card
                  onClickBack={() => {
                    if (creatorPlayer.player.hand.length >= turn) return;
                    creatorPlayer?.handlePushHand(index);
                  }}
                  key={item.id}
                  isFlipped={true}
                  cardValue={item}
                />
              ))}
            </div>
          </div>
          {/* infoArea */}
          <div className="flex justify-center items-center w-full gap-10">
            <div className="border h-px flex-1"></div>

            {isShouldNextTurn ? (
              <Button
                onClick={() => {
                  handleNextTurn();
                }}
              >
                Next Turn
              </Button>
            ) : (
              <div className=""> turn:{turn}</div>
            )}
            <div className="border h-px  flex-1"></div>
          </div>
          {/* joiner */}
          <div className="flex flex-1 flex-col justify-between">
            {/* chooseCard */}
            <div className="flex gap-2">
              {(joinerPlayer?.player?.hand || []).map((item, index) => (
                <Card
                  onClickBack={() => {
                    joinerPlayer.setCurrentCard(
                      joinerPlayer.currentCard === item.id ? undefined : item.id
                    );
                  }}
                  isDisabled={!item.isCanAttack}
                  isChoose={item.id === joinerPlayer.currentCard}
                  key={item.id}
                  isFlipped={true}
                  cardValue={item}
                />
              ))}
            </div>
            <div className=" h-px  flex-1"></div>
            <div className="flex gap-2  overflow-y-auto">
              {(joinerPlayer?.player?.deck || []).map((item, index) => (
                <Card
                  onClickBack={() => {
                    if (joinerPlayer.player.hand.length >= turn) return;
                    joinerPlayer?.handlePushHand(index);
                  }}
                  key={item.id}
                  isFlipped={true}
                  cardValue={item}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
