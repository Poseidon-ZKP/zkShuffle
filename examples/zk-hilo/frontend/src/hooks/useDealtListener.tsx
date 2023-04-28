import { useEffect, useState } from 'react';
import { CurrentStatusEnum, PULL_DATA_TIME } from './useGame';
import { getLogPrams } from '../utils/contracts';

function useDealtListener(
  contract: any,
  creator: string,
  joiner: string,
  provider: any,
  currentStatus: CurrentStatusEnum
) {
  const [isCreatorDealt, setIsCreatorDealt] = useState(false);
  const [isJoinerDealt, setIsJoinerDealt] = useState(false);

  const dealStatus = {
    creator: isCreatorDealt,
    joiner: isJoinerDealt,
  };

  const reset = () => {
    setIsCreatorDealt(false);
    setIsJoinerDealt(false);
  };

  const GameDealtListener = async (arg1: any, arg2: any, address: any) => {
    try {
      console.log('address', address);

      if (address === creator) {
        setIsCreatorDealt(true);
      }
      if (address === joiner) {
        setIsJoinerDealt(true);
      }
    } catch (error) {}
  };
  useEffect(() => {
    let interval: string | number | NodeJS.Timeout | null | undefined = null;
    if (!contract) return;
    const filter = contract.filters.DealCard();
    if (currentStatus !== CurrentStatusEnum.WAITING_FOR_DEAL) {
      interval && clearInterval(interval);
    } else {
      interval = setInterval(async () => {
        console.log('GameDealtListener');
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
          GameDealtListener(event.args[0], event.args[1], event.args[2]);
        }
      }, PULL_DATA_TIME);
    }

    return () => {
      interval && clearInterval(interval);
    };
  }, [contract, provider, joiner, creator, currentStatus]);

  // game DealListener
  // useEffect(() => {
  //   if (!contract) return;
  //   const GameDealtListener = async (arg1: any, arg2: any, address: any) => {
  //     try {
  //       console.log('address', address);

  //       if (address === creator) {
  //         setIsCreatorDealt(true);
  //       }
  //       if (address === joiner) {
  //         setIsJoinerDealt(true);
  //       }
  //     } catch (error) {}
  //   };

  //   contract?.on('DealCard', GameDealtListener);
  //   return () => {
  //     contract?.off('DealCard', GameDealtListener);
  //   };
  // }, [contract, creator, joiner]);

  return {
    dealStatus,
    reset,
  };
}

export default useDealtListener;
