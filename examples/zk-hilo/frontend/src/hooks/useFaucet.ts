import { useContractWrite, usePrepareContractWrite } from "wagmi";
import { contracts } from "../const/contracts";

const useFaucet = () => {
  const { config, error } = usePrepareContractWrite({
    address: contracts.HiLoToken.address,
    abi: contracts.HiLoToken.abi,
    functionName: "faucet",
  });
  if (error) {
    console.error(error);
  }
  return useContractWrite(config);
};

export default useFaucet;
