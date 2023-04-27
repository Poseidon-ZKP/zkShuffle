// game ShowHand listener

import { BigNumber, ethers } from 'ethers';
import { useEffect, useState } from 'react';

export interface UseEventProps {
  contract: any;
  fnName: string;
  addressIndex: number;
  creator: string;
  joiner: string;
}
function useEvent({
  contract,
  fnName,
  addressIndex,
  creator,
  joiner,
}: UseEventProps) {
  const [creatorValue, setCreatorValue] = useState<any>();
  const [joinerValue, setJoinerValue] = useState<any>();

  useEffect(() => {
    if (!contract) return;

    const Listener = async (...args: any[]) => {
      try {
        console.log(`listen ${fnName}`);
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
    contract?.on(fnName, Listener);
    return () => {
      contract?.off(fnName, Listener);
    };
  }, [addressIndex, contract, creator, fnName, joiner]);

  const handValues = {
    creator: creatorValue,
    joiner: joinerValue,
  };

  return {
    creator: creatorValue,
    joiner: joinerValue,
  };
}

export default useEvent;
