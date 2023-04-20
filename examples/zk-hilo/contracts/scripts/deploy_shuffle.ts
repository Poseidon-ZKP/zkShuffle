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
  const vk = await (
    await ethers.getContractFactory("ShuffleEncryptV2VerifierKey")
  )
    .connect(signer)
    .deploy();
  return await (
    await ethers.getContractFactory("Shuffle_encrypt_v2Verifier", {
      libraries: {
        ShuffleEncryptV2VerifierKey: vk.address,
      },
    })
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

  const shuffle = await deployShuffle(deployer);
  console.log(`Shuffle deployed to ${shuffle.address}`);

  const latest = {
    Shuffle: shuffle.address,
  };
  writeToFile(latest);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
