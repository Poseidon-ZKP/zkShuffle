import ShuffleContract from '../../../contracts/artifacts/contracts/shuffle/shuffle.sol/shuffle.json';
import HiLo from '../../../contracts/artifacts/contracts/game/HiLo.sol/HiLo.json';
import Broadcast from '../../../contracts/broadcast/latest.json';

export const contractAddress = '0x330f75AFfbA0646d935483e871aCA5Bd30A54295';
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
    address: contractAddress,
    abi: HiLo.abi,
  },
};
