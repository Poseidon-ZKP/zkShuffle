import { ethers, upgrades } from "hardhat";
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

  const factory = (await ethers.getContractFactory("KS")).connect(deployer);
  const ks = await upgrades.deployProxy(factory, [
    shuffle1.address,
    shuffle2.address,
  ]);
  await ks.deployed();
  console.log(`KS deployed to ${ks.address}`);

  await shuffle1.setGameContract(ks.address);
  await shuffle2.setGameContract(ks.address);
  console.log("shuffle set game contract");

  // write addresses to artifactsDir/broadcast/latest.json
  const latest = {
    Shuffle1: shuffle1.address,
    Shuffle2: shuffle2.address,
    KS: ks.address,
  };
  writeToFile(latest);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
