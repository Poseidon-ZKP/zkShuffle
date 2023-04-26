import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { writeToFile } from "./utils";

// Deploys contract for decrypt verifier
async function deployDecrypt(signer: SignerWithAddress) {
  return await (await ethers.getContractFactory("DecryptVerifier"))
    .connect(signer)
    .deploy();
}

// Deploys contract for shuffle encrypt v2.
async function deployShuffleEncryptV2(signer: SignerWithAddress) {
  return await (
    await ethers.getContractFactory("Shuffle_encryptVerifier_5cards")
  )
    .connect(signer)
    .deploy();
}

async function deployShuffle(signer: SignerWithAddress) {
  const shuffle_encrypt_v2_verifier_contract = await deployShuffleEncryptV2(
    signer
  );
  const decrypt_verifier_contract = await deployDecrypt(signer);
  return await (await ethers.getContractFactory("Shuffle"))
    .connect(signer)
    .deploy(
      shuffle_encrypt_v2_verifier_contract.address,
      decrypt_verifier_contract.address
    );
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const shuffle1 = await deployShuffle(deployer);
  console.log(`Shuffle 1 deployed to ${shuffle1.address}`);

  const shuffle2 = await deployShuffle(deployer);
  console.log(`Shuffle 1 deployed to ${shuffle2.address}`);

  const latest = {
    Shuffle1: shuffle1.address,
    Shuffle2: shuffle2.address,
  };
  writeToFile(latest);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
