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
  const [creatorCardValue, setCreatorValue] = useState<any>();
  const [joinerCardValue, setJoinerValue] = useState<any>();
  useEffect(() => {
    if (!contract) return;

    console.log(`listen ${fnName}`);

    const GameShowHandListener = async (...args: any[]) => {
      if (args[addressIndex] === creator) {
        setCreatorValue(args);
      }
      if (args[addressIndex] === joiner) {
        setJoinerValue(args);
      }
    };
    contract?.on(fnName, GameShowHandListener);
    return () => {
      contract?.off(fnName, GameShowHandListener);
    };
  }, [addressIndex, contract, creator, fnName, joiner]);

  const handValues = {
    creator: creatorCardValue,
    joiner: joinerCardValue,
  };

  return {
    handValues,
  };
}

export default useEvent;
