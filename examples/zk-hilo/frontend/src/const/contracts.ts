import ShuffleContract from '../../../contracts/artifacts/contracts/shuffle/shuffle.sol/shuffle.json';
import HiLo from '../../../contracts/artifacts/contracts/game/HiLo.sol/HiLo.json';
import Broadcast from '../../../contracts/broadcast/latest.json';
export const contracts = {
  // HiLoToken: {
  //   address: Broadcast.HiLoToken,
  //   abi: HiLoTokenContract.abi,
  // },
  Shuffle: {
    address: Broadcast.Shuffle,
    abi: ShuffleContract.abi,
  },
  HiLo: {
    address: '0x178c90ee83810FE64908e7C7c72F154e12D6d7aE',
    abi: HiLo.abi,
  },
};
