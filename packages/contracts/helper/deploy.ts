import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { DecryptVerifier__factory, Shuffle_encryptVerifier__factory, ShuffleManager__factory, Shuffle_encryptVerifier5Card__factory, Shuffle_encryptVerifier30Card__factory } from "../types";


// Depploys contract for decryption.
async function deployDecrypt(owner : SignerWithAddress) {
    return await (new DecryptVerifier__factory(owner)).deploy()
}

// Deploys contract for shuffle encrypt.
async function deployShuffleEncrypt(owner : SignerWithAddress) {
    return await (new Shuffle_encryptVerifier__factory(owner)).deploy()
}

async function deployShuffleEncryptCARD30(owner : SignerWithAddress) {
    return await (new Shuffle_encryptVerifier30Card__factory(owner)).deploy()
}


async function deployShuffleEncryptCARD5(owner : SignerWithAddress) {
    return await (new Shuffle_encryptVerifier5Card__factory(owner)).deploy()
}

export async function deploy_shuffle_manager(owner : SignerWithAddress) {

    const encrypt52 = await deployShuffleEncrypt(owner);
    const encrypt30 = await deployShuffleEncryptCARD30(owner);
    const encrypt5  = await deployShuffleEncryptCARD5(owner)
    const decrypt = await deployDecrypt(owner);

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

