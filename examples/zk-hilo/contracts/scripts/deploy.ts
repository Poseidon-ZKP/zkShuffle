import { resolve } from "path";
const fs = require("fs");
import { ethers } from "hardhat";

const privateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
const signer = new ethers.Wallet(privateKey, provider);
const specifiedNumPlayer = 2;
const baseDir = resolve(__dirname, "..");
// Deploys contract for decrypt verifier
async function deployDecrypt() {
  return await (await ethers.getContractFactory("DecryptVerifier")).deploy();
}

// Deploys contract for shuffle encrypt v2.
async function deployShuffleEncryptV2() {
  const vk = await (
    await ethers.getContractFactory("ShuffleEncryptV2VerifierKey")
  ).deploy();
  return await (
    await ethers.getContractFactory("Shuffle_encrypt_v2Verifier", {
      libraries: {
        ShuffleEncryptV2VerifierKey: vk.address,
      },
    })
  ).deploy();
}

async function deployShuffle() {
  const shuffle_encrypt_v2_verifier_contract = await deployShuffleEncryptV2();
  const decrypt_verifier_contract = await deployDecrypt();
  return await (await ethers.getContractFactory("Shuffle"))
    .connect(signer)
    .deploy(
      shuffle_encrypt_v2_verifier_contract.address,
      decrypt_verifier_contract.address
    );
}

async function deployGameContract(shuffle: any) {
  return await (
    await ethers.getContractFactory("HiLo")
  ).deploy(shuffle.address);
}

async function main() {
  const shuffle = await deployShuffle();
  console.log(`Shuffle deployed to ${shuffle.address}`);

  const gameContract = await deployGameContract(shuffle);
  console.log(`HiLo deployed to ${gameContract.address}`);

  // write addresses to artifactsDir/broadcast/latest.json
  const latest = {
    Shuffle: shuffle.address,
    HiLo: gameContract.address,
  };
  await fs.promises.mkdir(resolve(baseDir, "broadcast"), {
    recursive: true,
  });
  const latestPath = resolve(baseDir, "broadcast", "latest.json");
  await fs.writeFileSync(latestPath, JSON.stringify(latest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
