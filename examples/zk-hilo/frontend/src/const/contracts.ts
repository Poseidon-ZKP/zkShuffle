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
    address: '0xbe648Dcfe0B565cddd424ab59B59065109A11901',
    abi: HiLo.abi,
  },
};
