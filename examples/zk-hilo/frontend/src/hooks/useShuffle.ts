import { useContractWrite, usePrepareContractWrite } from "wagmi";
import { contracts } from "../const/contracts";
import { BigNumber } from "ethers";

const useShuffle = (
    permanentAccount: string,
    proof: BigNumber,
    nounce: BigNumber,
    shuffledX0: BigNumber,
    shuffledX1: BigNumber,
    selector: BigNumber,
    gameId: BigNumber
) => {
    const { config, error } = usePrepareContractWrite({
        address: contracts.Shuffle.address,
        abi: contracts.Shuffle.abi,
        functionName: "shuffle",
        args: [permanentAccount, proof, nounce, shuffledX0, shuffledX1, selector, gameId],
        overrides: {
            gasLimit: BigNumber.from(1000000),
        }
    });
    if (error) {
        console.error(error);
    }
    return useContractWrite(config);
};

export default useShuffle;
