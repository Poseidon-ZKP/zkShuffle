import { ethers, upgrades } from "hardhat";
import { getDeployment } from "./utils";

async function main() {
  const [deployer] = await ethers.getSigners();
  const factory = (await ethers.getContractFactory("KS")).connect(deployer);

  const upgraded = await upgrades.upgradeProxy(getDeployment().KS, factory);
  console.log(`upgrade success!`, upgraded.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
