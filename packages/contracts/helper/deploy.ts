import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { DecryptVerifier, ShuffleManager__factory, Shuffle_encryptVerifier5Card__factory } from "../types";


// Depploys contract for decryption.
async function deployDecrypt() {
    return <DecryptVerifier>await (await ethers.getContractFactory('DecryptVerifier')).deploy();
}

// Deploys contract for shuffle encrypt.
async function deployShuffleEncrypt() {
    const vk = await (await ethers.getContractFactory('ShuffleEncryptVerifierKey')).deploy();
    return await (await ethers.getContractFactory('Shuffle_encryptVerifier', {
        libraries: {
            ShuffleEncryptVerifierKey: vk.address,
        }
    })).deploy();
}

async function deployShuffleEncryptCARD30() {
    return await (await ethers.getContractFactory('Shuffle_encryptVerifier_30card')).deploy();
}


async function deployShuffleEncryptCARD5(owner : SignerWithAddress) {
    return await (new Shuffle_encryptVerifier5Card__factory(owner)).deploy()
}

export async function deploy_shuffle_manager(owner : SignerWithAddress) {

    const encrypt52 = await deployShuffleEncrypt();
    const encrypt30 = await deployShuffleEncryptCARD30();
    const encrypt5  = await deployShuffleEncryptCARD5(owner)
    const decrypt = await deployDecrypt();

    const crypto = await (await ethers.getContractFactory('zkShuffleCrypto')).deploy();
    const sm = await (await ethers.getContractFactory('ShuffleManager', {
        libraries: {
            zkShuffleCrypto: crypto.address,
        }
    })).deploy(
        decrypt.address,
        encrypt52.address,
        encrypt30.address,
        encrypt5.address
    );
    return ShuffleManager__factory.connect(sm.address, owner)
}

