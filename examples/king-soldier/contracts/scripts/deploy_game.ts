import { ethers } from "hardhat";
import { writeToFile, getDeployment } from "./utils";

async function main() {
  const [deployer] = await ethers.getSigners();

  const shuffle1 = await ethers.getContractAt(
    "Shuffle",
    getDeployment().Shuffle1
  );
  const shuffle2 = await ethers.getContractAt(
    "Shuffle",
    getDeployment().Shuffle2
  );

  const gameContract = await (await ethers.getContractFactory("KS"))
    .connect(deployer)
    .deploy(shuffle1.address, shuffle2.address);
  console.log(`KS deployed to ${gameContract.address}`);

  await shuffle1.setGameContract(gameContract.address);
  await shuffle2.setGameContract(gameContract.address);
  console.log("shuffle set game contract");

  // write addresses to artifactsDir/broadcast/latest.json
  const latest = {
    Shuffle1: shuffle1.address,
    Shuffle2: shuffle2.address,
    KS: gameContract.address,
  };
  writeToFile(latest);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
