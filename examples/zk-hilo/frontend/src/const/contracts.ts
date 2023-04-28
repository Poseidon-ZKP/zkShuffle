import ShuffleContract from '../../../contracts/artifacts/contracts/shuffle/shuffle.sol/shuffle.json';
import HiLo from '../../../contracts/artifacts/contracts/game/HiLo.sol/HiLo.json';
import Broadcast from '../../../contracts/broadcast/latest.json';

export const contractAddress = '0x22c284b67e36AdbA061909039E6c53e5961dbBF0';
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
