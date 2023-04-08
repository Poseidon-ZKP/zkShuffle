import { resolve } from "path";
const fs = require("fs");
import { ethers } from "hardhat";

const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
const signer = new ethers.Wallet(privateKey, provider);
const specifiedNumPlayer = 2;
const baseDir = resolve(__dirname, "..");
// Deploys contract for decrypt verifier
async function deployDecrypt() {
  return (
    await (await ethers.getContractFactory("DecryptVerifier")).deploy()
  );
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
  return await (await ethers.getContractFactory("Shuffle")).connect(signer).deploy(
    shuffle_encrypt_v2_verifier_contract.address,
    decrypt_verifier_contract.address,
    specifiedNumPlayer
  );
}

async function deployGameToken() {
  return (
    await (await ethers.getContractFactory("GameToken")).deploy(
      "HiLoToken",
      "HILO",
      10 ** 8
    )
  );
}

async function deployAccountManagement(hiLoToken: any) {

  const ratio = 1;
  const minAmount = 10;
  const delay = 0;
  const vig = 100; // 1%

  return (
    await (await ethers.getContractFactory("AccountManagement")).deploy(
      hiLoToken.address,
      ratio,
      minAmount,
      delay,
      vig
    )
  );
}

async function deployGameEvaluator() {
  return (
    await (await ethers.getContractFactory("HiLoEvaluator")).deploy()
  );
}

async function deployGameContract(shuffle: any, gameEvaluator: any, accountManagement: any, needPresendGas: boolean) {
  return (
    await (await ethers.getContractFactory("HiLo")).deploy(
      shuffle.address,
      gameEvaluator.address,
      accountManagement.address,
      needPresendGas
    )
  );
}


async function main() {

  const hiLoToken = await deployGameToken();
  console.log(`HiLoToken deployed to ${hiLoToken.address}`);

  const shuffle = await deployShuffle();
  console.log(`Shuffle deployed to ${shuffle.address}`);

  const accountManagement = await deployAccountManagement(hiLoToken);
  console.log(`AccountManagement deployed to ${accountManagement.address}`)

  const gameEvaluator = await deployGameEvaluator();
  console.log(`HiLoEvaluator deployed to ${gameEvaluator.address}`)

  const gameContract = await deployGameContract(shuffle, gameEvaluator, accountManagement, false);
  console.log(`HiLo deployed to ${gameContract.address}`)

  // write addresses to artifactsDir/broadcast/latest.json
  const latest = {
    HiLoToken: hiLoToken.address,
    Shuffle: shuffle.address,
    AccountManagement: accountManagement.address,
    HiLoEvaluator: gameEvaluator.address,
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
