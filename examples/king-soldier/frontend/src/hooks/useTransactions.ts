import useWriteContract from './useWriteContract';

function useTransactions({ contract }: { contract: any }) {
  const joinGameStatus = useWriteContract(contract?.['joinGame'], {
    args: [],
    wait: true,
  });

  const shuffleStatus = useWriteContract(contract?.['shuffle'], {
    args: [],
    wait: true,
  });

  const dealStatus = useWriteContract(contract?.['dealHandCard'], {
    args: [],
    wait: true,
  });

  const chooseStatus = useWriteContract(contract?.['chooseCard'], {
    args: [],
    wait: true,
  });

  const showHandStatus = useWriteContract(contract?.['showHand'], {
    args: [],
    wait: true,
  });
  const createGameKingStatus = useWriteContract(contract?.['createGame'], {
    args: [],
    wait: true,
  });
  const createGameSoldierStatus = useWriteContract(contract?.['createGame'], {
    args: [],
    wait: true,
  });

  return {
    joinGameStatus,
    shuffleStatus,
    dealStatus,
    chooseStatus,
    showHandStatus,
    createGameKingStatus,
    createGameSoldierStatus,
  };
}

export default useTransactions;
