import { useState } from 'react';

import { InjectedConnector } from 'wagmi/connectors/injected';

// import useFaucet from "../hooks/useFaucet";
import { useAccount, useConnect } from 'wagmi';

import React, { useEffect } from 'react';
import {
  PlayerContracts,
  PlayerInfos,
  getBabyPk,
  getContracts,
  getPlayerPksAndSks,
  numPlayers,
  playerAddresses,
} from '../utils/newUtils';
import { useRouter } from 'next/router';
import { useGame } from '../hooks/useGame';
import { useOwnerGame } from '../hooks/useOwnerGame';
import { useJoinerGame } from '../hooks/userJoinerGame';

import { useZKContext } from '../hooks/useZKContext';
import { useResourceContext } from '../hooks/useResourceContext';

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

export default function Home() {
  const { connect } = useConnect({
    connector: new InjectedConnector(),
  });
  const resourceContext = useResourceContext();
  if (!resourceContext) {
    throw new Error('resource context is not ready');
  }
  const {
    hasSetup,
    settingUp,
    fetchingFailed,
    aggregatedKey,
    setupBeforeJoin,
    saveAggregateKeys,
  } = resourceContext;

  useEffect(() => {
    if (hasSetup || settingUp) {
      return;
    }
    console.log('set up before join');
    setupBeforeJoin();
  }, [hasSetup, settingUp, setupBeforeJoin]);

  // useEffect(() => {
  //   if (!aggregatedKey) {
  //     // recover the pk to correct form
  //     saveAggregateKeys(
  //       cachedBoard.pks.map((pk) => pk.map((p) => p.toString()))
  //     );
  //   }

  //   return () => {
  //     second;
  //   };
  // }, [third]);

  const {
    contract,
    playerPksAndSks,
    owner,
    joiner,
    address,
    isJoined,
    gameId,
  } = useGame();

  const { startGame } = useOwnerGame({
    ownerAddress: owner as string,
    ownerContract: contract,
    ownerPksAndSks: playerPksAndSks?.[owner as string],
  });

  // const { isJoined } = useJoinerGame({
  //   userAddress: address,
  //   ownerAddress: owner as string,
  //   joinerAddress: joiner as string,
  //   joinerContract: contract,
  //   joinerPksAndSks: playerPksAndSks?.[joiner as string],
  // });

  const isOwner = address === owner;

  // const getGameInfos = async () => {
  //   const games = await userContract?.['games'](7);
  //   console.log('games', games);
  // };

  // useEffect(() => {
  //   if (!userContract) return;
  //   getGameInfos();

  //   return () => {};
  // }, [userContract]);

  return (
    <>
      <div className=" flex flex-col min-h-screen bg-black ">
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

        <div className="flex flex-col items-center justify-center h-screen text-white ">
          <img className="mb-10" src="/logo.png" />
          <ul className="bg-black mb-10 border-[#4B87C8] border border-2 text-[#DABEF1] py-2 px-4 rounded-lg">
            <li>
              creator:{owner} - {gameId ? 'Created' : 'not Created'}
            </li>
            <li>
              Joiner:{joiner} - {isJoined ? 'hasJoined' : 'not Joined yet'}
            </li>
          </ul>

          {isOwner && !gameId && (
            <>
              <button
                onClick={() => {
                  console.log('31141');
                  startGame();
                }}
                className="bg-black border-[#4B87C8] border border-2 text-[#DABEF1] py-2 px-4 rounded-lg"
              >
                Start Game
              </button>
            </>
          )}
          {gameId && <div>game is going</div>}
        </div>
      </div>
    </>
  );
}
