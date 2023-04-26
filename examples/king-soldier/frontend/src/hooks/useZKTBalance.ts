import { useAccount, useBalance, useContractRead } from "wagmi";
import { contracts } from "../const/contracts";
import { mockWallet } from "../lib/mockWallet";

const useZKTBalance = () => {
  const { address } = useAccount();
  return useContractRead({
    address: contracts.HiLoToken.address as `0x${string}`,
    abi: contracts.HiLoToken.abi,
    functionName: "balanceOf",
    args: [address],
  });
};

export default useZKTBalance;
