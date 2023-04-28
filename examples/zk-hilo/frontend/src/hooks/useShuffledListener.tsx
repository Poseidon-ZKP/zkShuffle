import { useEffect, useState } from 'react';
import { getLogPrams } from '../utils/contracts';
import { CurrentStatusEnum, PULL_DATA_TIME } from './useGame';
import { sleep } from '../utils/common';

function useShuffledListener(
  contract: any,
  creator: string,
  joiner: string,
  address: string,
  provider: any,
  currentStatus: CurrentStatusEnum
) {
  const [isCreatorShuffled, setIsCreatorShuffled] = useState(false);
  const [isJoinerShuffled, setIsJoinerShuffled] = useState(false);
  const [isShouldTriggerJoinerShuffle, setIsShouldTriggerJoinerShuffle] =
    useState(false);

  const isCreator = creator === address;

  const reset = () => {
    setIsCreatorShuffled(false);
    setIsJoinerShuffled(false);
    setIsShouldTriggerJoinerShuffle(false);
  };

  const GameShuffledListener = async (arg1: string, shuffledAddress: any) => {
    try {
      await sleep(2000);
      if (shuffledAddress === creator) {
        setIsCreatorShuffled(true);
      }

      if (shuffledAddress === joiner) {
        setIsJoinerShuffled(true);
      }

      if (shuffledAddress === creator) {
        //  joiner goes to shuffle
        if (!isCreator) {
          setIsShouldTriggerJoinerShuffle(true);
        }
      }
    } catch (error) {
      console.log('GameShuffledListener error');
    }
  };

  useEffect(() => {
    let interval: string | number | NodeJS.Timeout | null | undefined = null;
    if (!contract) return;
    const filter = contract.filters.ShuffleDeck();
    if (
      currentStatus !== CurrentStatusEnum.WAITING_FOR_CREATOR_SHUFFLE &&
      currentStatus !== CurrentStatusEnum.WAITING_FOR_JOINER_SHUFFLE
    ) {
      interval && clearInterval(interval);
    } else {
      interval = setInterval(async () => {
        const logs = await provider.getLogs(
          getLogPrams({
            filter: filter,
            address: contract?.address,
            provider: provider,
          })
        );

        logs.forEach((log: any) => {
          const event = contract.interface.parseLog(log);
          GameShuffledListener(event.args[0], event.args[1]);
        });
      }, PULL_DATA_TIME);
    }

    return () => {
      interval && clearInterval(interval);
    };
  }, [contract, provider, joiner, creator, currentStatus]);

  // game ShuffleListener
  // useEffect(() => {
  //   if (!contract) return;

  //   contract?.on('ShuffleDeck', GameShuffledListener);
  //   return () => {
  //     contract?.off('ShuffleDeck', GameShuffledListener);
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [contract, isCreator, creator, joiner]);

  const shuffleStatus = {
    creator: isCreatorShuffled,
    joiner: isJoinerShuffled,
    isShouldTriggerJoinerShuffle: isShouldTriggerJoinerShuffle,
  };

  return {
    shuffleStatus,
    reset,
  };
}

export default useShuffledListener;
