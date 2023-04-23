// game ShowHand listener

import { BigNumber, ethers } from 'ethers';
import { useEffect, useState } from 'react';

function useShowHandListener(contract: any, creator: string, joiner: string) {
  const [creatorCardValue, setCreatorValue] = useState<number>();
  const [joinerCardValue, setJoinerValue] = useState<number>();
  useEffect(() => {
    if (!contract) return;
    const GameShowHandListener = async (
      gameId: number,
      cardIdx: number,
      cardValue: BigNumber,
      address: string
    ) => {
      console.log('GameShowHandListener');
      console.log('gameId', gameId);
      console.log('cardIdx', cardIdx);
      console.log('cardValue', cardValue);
      console.log('address', address);

      if (address === creator) {
        console.log('cardValue', cardValue?.toNumber());
        setCreatorValue(cardValue?.toNumber());
      }
      if (address === joiner) {
        console.log('cardValue', cardValue?.toNumber());
        setJoinerValue(cardValue?.toNumber());
      }
    };
    contract?.on('ShowCard', GameShowHandListener);
    return () => {
      contract?.off('ShowCard', GameShowHandListener);
    };
  }, [contract, creator, joiner]);

  const handValues = {
    creator: creatorCardValue,
    joiner: joinerCardValue,
  };

  return {
    handValues,
  };
}

export default useShowHandListener;
