import HiLoTokenContract from "../../../contracts/artifacts/contracts/game/HiLoToken.sol/HiLoToken.json";
import Broadcast from "../../../contracts/broadcast/latest.json";
import ShuffleContract from "../../../contracts/artifacts/contracts/shuffle/shuffle.sol/shuffle.json";
import HiLo from "../../../contracts/artifacts/contracts/game/HiLo.sol/HiLo.json";

export const contracts = {
  HiLoToken: {
    address: Broadcast.HiLoToken,
    abi: HiLoTokenContract.abi,
  },
  Shuffle: {
    address: Broadcast.Shuffle,
    abi: ShuffleContract.abi,
  },
  HiLo: {
    address: Broadcast.HiLo,
    abi: HiLo.abi,
  },
};
