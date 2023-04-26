import { useEffect, useState } from 'react';

function useDealtListener(contract: any, creator: string, joiner: string) {
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
  // game DealListener
  useEffect(() => {
    if (!contract) return;
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

    contract?.on('DealCard', GameDealtListener);
    return () => {
      contract?.off('DealCard', GameDealtListener);
    };
  }, [contract, creator, joiner]);

  return {
    dealStatus,
    reset,
  };
}

export default useDealtListener;
