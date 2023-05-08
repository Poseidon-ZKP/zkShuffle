import { Contract } from 'ethers';
import useWriteContract from './useWriteContract';

export interface UseTransactions {
  contract?: Contract;
}

function useTransactions({ contract }: UseTransactions) {
  const createGameStatus = useWriteContract(contract?.['createGame'], {
    args: [],
    wait: true,
  });

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

  const guessStatus = useWriteContract(contract?.['guess'], {
    args: [],
    wait: true,
  });

  const showHandStatus = useWriteContract(contract?.['showHand'], {
    args: [],
    wait: true,
  });
  return {
    createGameStatus,
    showHandStatus,
    dealStatus,
    shuffleStatus,
    joinGameStatus,
    guessStatus,
  };
}
export default useTransactions;
