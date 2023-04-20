import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  PlayerContracts,
  PlayerInfos,
  getBabyjub,
  getContracts,
  getPlayerPksAndSks,
  numPlayers,
} from '../utils/newUtils';

export function useGame() {
  const router = useRouter();

  const [contracts, setContracts] = useState<PlayerContracts>();
  const [playerPksAndSks, setPlayerPksAndSks] = useState<PlayerInfos>();

  const owner = router?.query?.owner;
  const otherAddress = router?.query?.otherAddress;
  const playerAddresses = [owner, otherAddress];

  const handleGetBabyPk = async () => {
    const babyJubs = await getBabyjub(numPlayers);
    const playerPksAndSks = getPlayerPksAndSks(
      babyJubs,
      playerAddresses as string[]
    );
    setPlayerPksAndSks(playerPksAndSks);
  };

  const handleGetContracts = () => {
    const contracts = getContracts(playerAddresses as string[]);
    setContracts(contracts);
  };

  useEffect(() => {
    if (!router.isReady) return;
    handleGetContracts();
    handleGetBabyPk();
  }, [router.isReady]);

  return {
    contracts,
    playerPksAndSks,
  };
}
