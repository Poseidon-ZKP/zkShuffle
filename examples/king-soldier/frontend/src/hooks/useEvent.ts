// game ShowHand listener

import { BigNumber, ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { useProvider } from 'wagmi';
import { getLogPrams } from '../utils/contracts';

export interface UseEventProps {
  contract: any;
  filter?: ethers.EventFilter;
  isStop?: boolean;
  addressIndex: number;
  creator: string;
  joiner: string;
}

export const PULL_DATA_TIME = 2000;

function useEvent({
  contract,
  filter,
  isStop = true,
  addressIndex,
  creator,
  joiner,
}: UseEventProps) {
  const provider = useProvider();
  const [creatorValue, setCreatorValue] = useState<any>();
  const [joinerValue, setJoinerValue] = useState<any>();

  const listener = async (...args: any[]) => {
    try {
      // console.log(`listen ${fnName}`);
      console.log('args', args);
      if (args[addressIndex] === creator) {
        setCreatorValue(args);
      }
      if (args[addressIndex] === joiner) {
        setJoinerValue(args);
      }
    } catch (error) {
      console.log(error, error);
    }
  };

  useEffect(() => {
    let interval: string | number | NodeJS.Timer | null | undefined = null;
    if (!contract) return;

    if (!isStop) {
      interval = setInterval(async () => {
        const logs = await provider.getLogs(
          getLogPrams({
            filter: filter,
            address: contract?.address,
            provider: provider,
          })
        );

        console.log('logs', logs);

        logs.forEach((log: any) => {
          const event = contract.interface.parseLog(log);
          listener(...event.args);
        });
      }, PULL_DATA_TIME);
    } else {
      interval && clearInterval(interval);
    }

    return () => {
      interval && clearInterval(interval);
    };
  }, [addressIndex, contract, creator, filter, isStop, joiner, provider]);

  return {
    creator: creatorValue,
    joiner: joinerValue,
  };
}

export default useEvent;
