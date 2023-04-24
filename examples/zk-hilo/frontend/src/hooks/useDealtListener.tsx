import { useEffect, useState } from 'react';
import { sleep } from '../utils/common';

function useDealtListener(contract: any, creator: string, joiner: string) {
  const [isCreatorDealt, setIsCreatorDealt] = useState(false);
  const [isJoinerDealt, setIsJoinerDealt] = useState(false);

  const dealStatus = {
    creator: isCreatorDealt,
    joiner: isJoinerDealt,
  };
  // game DealListener
  useEffect(() => {
    if (!contract) return;
    const GameDealtListener = async (arg1: any, arg2: any, address: any) => {
      try {
        console.log('address', address);

        if (address === creator) {
          await sleep(4000);
          setIsCreatorDealt(true);
        }
        if (address === joiner) {
          await sleep(4000);
          setIsJoinerDealt(true);
        }
      } catch (error) {}
    };

    contract?.on('DealCard', GameDealtListener);
    return () => {
      contract?.off('DealCard', GameDealtListener);
    };
  }, [contract, creator, joiner]);

  return {
    dealStatus,
  };
}

export default useDealtListener;
