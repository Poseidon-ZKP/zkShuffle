import { ethers } from "hardhat";
import { writeToFile, getDeployment } from "./utils";

async function main() {
  const [deployer] = await ethers.getSigners();

  const shuffleContractAddress = getDeployment().Shuffle;
  const shuffle = await ethers.getContractAt("Shuffle", shuffleContractAddress);

  const gameContract = await (await ethers.getContractFactory("HiLo"))
    .connect(deployer)
    .deploy(shuffle.address);
  console.log(`HiLo deployed to ${gameContract.address}`);

  await shuffle.setGameContract(gameContract.address);
  console.log("shuffle set game contract");

  // write addresses to artifactsDir/broadcast/latest.json
  const latest = {
    Shuffle: shuffle.address,
    HiLo: gameContract.address,
  };
  writeToFile(latest);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
