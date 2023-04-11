import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { resolve } from 'path';
import { DecryptVerifier__factory, Shuffle, ShuffleEncryptVerifierKey, ShuffleEncryptVerifierKey__factory, Shuffle_encryptVerifier__factory, Shuffle__factory} from "types";
const buildBabyjub = require('circomlibjs').buildBabyjub;
const Scalar = require("ffjavascript").Scalar;
const fs = require('fs');
const https = require('https')

// todo
export type BabyJub = any;
export type EC = any;
export type Deck = any;

// Wrap cryptography details(pk/sk, proof generate)
export class ShuffleCtx {

    babyjub : any
    smc : Shuffle
    gc : SignerWithAddress
    pk : EC
    sk : any

    constructor(
        stateMachineContract : Shuffle,
        gameContract : SignerWithAddress
    ) {
        this.gc = gameContract
        this.smc = stateMachineContract.connect(gameContract)
    }

	async init(
	) {
        await Promise.all(['wasm/decrypt.wasm', 'zkey/decrypt.zkey', 'wasm/shuffle_encrypt.wasm.52', 'zkey/shuffle_encrypt.zkey.52', 'wasm/shuffle_encrypt.wasm.30', 'zkey/shuffle_encrypt.zkey.30'].map(
            async (e) => {
                await this.dnld_aws(e)
            }
        ));
        this.babyjub = await buildBabyjub();
        const keys = this.keyGen(BigInt(251))
        this.pk = keys.pk
        this.sk = keys.sk
	}

    /// Samples field elements between 0 ~ min(2**numBits-1, Fr size).
    sampleFieldElements(
        numBits: bigint,
        numElements: bigint,
    ): bigint[] {
        let arr = [];
        let num: bigint;
        const threshold = Scalar.exp(2, numBits);
        for (let i = 0; i < numElements; i++) {
            do {
                num = Scalar.fromRprLE(this.babyjub.F.random());
            } while (Scalar.geq(num, threshold));
            arr.push(num);
        }
        return arr;
    }
    
    // Generates a secret key between 0 ~ min(2**numBits-1, Fr size).
    keyGen(numBits: bigint): { g: EC, sk: bigint, pk: EC } {
        const sk = this.sampleFieldElements(this.babyjub, numBits, 1n)[0];
        return { g: this.babyjub.Base8, sk: sk, pk: this.babyjub.mulPointEscalar(this.babyjub.Base8, sk) }
    }

	shuffle() {
        // get paramemeter on-chain, return proof
    }

	deal() {

    }

    async dnld_aws(file_name : string) {
        const HOME_DIR = require('os').homedir();
        const P0X_DIR = resolve(HOME_DIR, "./.poseidon-zkp")
        const P0X_AWS_URL = "https://p0x-labs.s3.amazonaws.com/refactor/"
        fs.mkdir(P0X_DIR, () => {})
        fs.mkdir(resolve(P0X_DIR, './wasm'), () => {})
        fs.mkdir(resolve(P0X_DIR, './zkey'), () => {})
        return new Promise((reslv, reject) => {
            if (!fs.existsSync(resolve(P0X_DIR, file_name))) {
                const file = fs.createWriteStream(resolve(P0X_DIR, file_name))
                https.get(P0X_AWS_URL + file_name, (resp) => {
                    file.on("finish", () => {
                        file.close();
                        reslv(0)
                    });
                    resp.pipe(file)
                });
            } else {
                reslv(0)
            }
        });
    }

}

async function fullporcess() {
    // leave contract to user
    const signers = await ethers.getSigners()
    const owner = signers[0];
    const gameContract = signers[1]
    const vk : ShuffleEncryptVerifierKey = await (new ShuffleEncryptVerifierKey__factory(owner)).deploy()
    const encrypt = await (await ethers.getContractFactory('Shuffle_encryptVerifier', {
        libraries: {
            ShuffleEncryptVerifierKey: vk.address,
        }
    })).deploy();
    const decrypt = await (new DecryptVerifier__factory(owner)).deploy()

    let stateMachineContract : Shuffle = await (new Shuffle__factory(owner)).deploy(
        [
            {
                numCards : 52,
                encryptVerifier : encrypt.address
            }
        ],
        decrypt.address
    )
    await (await stateMachineContract.setGameContract(gameContract.address)).wait()


    const NumCard2Deal = 5
    const numPlayers = 2
    const numCards = 52
    const gameId = 1
    stateMachineContract.connect(gameContract).setGameSettings(numPlayers, numCards, gameId);


    const ctx = new ShuffleCtx(stateMachineContract, gameContract)
    await ctx.init()
    ctx.shuffle()
    ctx.deal()


    // Queries aggregated public key
    const key = await stateMachineContract.queryAggregatedPk(gameId);
    const aggregatePk = [key[0].toBigInt(), key[1].toBigInt()];
}

fullporcess()
.then(() => process.exit(0))
.catch(error => {
  console.error(error);
  process.exit(1);
});
