// game ShowHand listener

import { BigNumber } from 'ethers';
import { useEffect, useState } from 'react';
import { getLogPrams } from '../utils/contracts';
import { CurrentStatusEnum, PULL_DATA_TIME } from './useGame';

function useShowHandListener(
  contract: any,
  provider: any,
  currentStatus: CurrentStatusEnum,
  creator: string,
  joiner: string
) {
  const [creatorCardValue, setCreatorValue] = useState<number>();
  const [joinerCardValue, setJoinerValue] = useState<number>();

  const reset = () => {
    setCreatorValue(undefined);
    setJoinerValue(undefined);
  };

  const GameShowHandListener = async (
    gameId: number,
    cardIdx: number,
    cardValue: BigNumber,
    address: string
  ) => {
    if (address === creator) {
      console.log('cardValue', cardValue?.toNumber());
      setCreatorValue(cardValue?.toNumber());
    }
    if (address === joiner) {
      console.log('cardValue', cardValue?.toNumber());
      setJoinerValue(cardValue?.toNumber());
    }
  };

  useEffect(() => {
    let interval: string | number | NodeJS.Timer | null | undefined = null;
    if (!contract) return;
    const filter = contract.filters.ShowCard();

    if (currentStatus === CurrentStatusEnum.WAITING_FOR_SHOW) {
      interval = setInterval(async () => {
        const logs = await provider.getLogs(
          getLogPrams({
            filter: filter,
            address: contract?.address,
            provider: provider,
          })
        );
        const lastLog = logs[logs.length - 1];

        if (lastLog) {
          const event = contract.interface.parseLog(lastLog);
          console.log('Event name:', event.name);
          console.log('event.args', event.args, event.args[0], event.args[1]);
          await GameShowHandListener(
            event.args[0],
            event.args[1],
            event.args[2],
            event.args[3]
          );
        }
      }, PULL_DATA_TIME);
    } else {
      interval && clearInterval(interval);
    }

    return () => {
      interval && clearInterval(interval);
    };
  }, [contract, creator, joiner, currentStatus]);

  // useEffect(() => {
  //   if (!contract) return;

  //   contract?.on('ShowCard', GameShowHandListener);
  //   return () => {
  //     contract?.off('ShowCard', GameShowHandListener);
  //   };
  // }, [contract, creator, joiner]);

  const handValues = {
    creator: creatorCardValue,
    joiner: joinerCardValue,
  };

  return {
    handValues,
    reset,
  };
}

export default useShowHandListener;
