import ShuffleContract from '../../../contracts/artifacts/contracts/shuffle/shuffle.sol/shuffle.json';
import HiLo from '../../../contracts/artifacts/contracts/game/HiLo.sol/HiLo.json';

export const contracts = {
  // HiLoToken: {
  //   address: Broadcast.HiLoToken,
  //   abi: HiLoTokenContract.abi,
  // },
  Shuffle: {
    // address: Broadcast.Shuffle,
    abi: ShuffleContract.abi,
  },
  HiLo: {
    // address: Broadcast.HiLo,
    abi: HiLo.abi,
  },
};
