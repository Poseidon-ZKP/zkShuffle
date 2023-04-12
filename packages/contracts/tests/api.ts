import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { shuffleEncryptV2Plaintext } from "@poseidon-zkp/poseidon-zk-proof/src/shuffle/plaintext";
import { dealCompressedCard, dealUncompressedCard, generateShuffleEncryptV2Proof, packToSolidityProof, SolidityProof } from "@poseidon-zkp/poseidon-zk-proof/src/shuffle/proof";
import { prepareShuffleDeck, sampleFieldElements, samplePermutation, searchDeck } from "@poseidon-zkp/poseidon-zk-proof/src/shuffle/utilities";
import { ethers } from "hardhat";
import { resolve } from 'path';
import { DecryptVerifier__factory, Shuffle, ShuffleEncryptVerifierKey, ShuffleEncryptVerifierKey__factory, Shuffle_encryptVerifier__factory, Shuffle__factory} from "../types";
const buildBabyjub = require('circomlibjs').buildBabyjub;
const fs = require('fs');
const https = require('https')
const HOME_DIR = require('os').homedir();
const P0X_DIR = resolve(HOME_DIR, "./.poseidon-zkp")
const P0X_AWS_URL = "https://p0x-labs.s3.amazonaws.com/refactor/"

export async function dnld_aws(file_name : string) {
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

// todo
export type BabyJub = any;
export type EC = any;
export type Deck = any;

// Wrap cryptography details(pk/sk, proof generate)
// TODO : let user decide all contract call ? or anything wrapper in the ctx?
// whether dapp devloper want control. maybe 2 kinds of interface.
export class ShuffleCtx {

    babyjub : any
    smc : Shuffle
    gc : SignerWithAddress
    owner : SignerWithAddress
    pk : EC
    sk : any
    encrypt_wasm : any
    encrypt_zkey : any
    decrypt_wasm : any
    decrypt_zkey : any

    constructor(
        stateMachineContract : Shuffle,
        gameContract : SignerWithAddress,
        owner : SignerWithAddress
    ) {
        this.gc = gameContract
        this.owner = owner
        this.smc = stateMachineContract.connect(gameContract)
    }

	async init(
	) {
        await Promise.all(['wasm/decrypt.wasm', 'zkey/decrypt.zkey', 'wasm/encrypt.wasm', 'zkey/encrypt.zkey'].map(
            async (e) => {
                await dnld_aws(e)
            }
        ));
        this.decrypt_wasm = resolve(P0X_DIR, './wasm/decrypt.wasm');
        this.decrypt_zkey = resolve(P0X_DIR, './zkey/decrypt.zkey');
        this.encrypt_wasm = resolve(P0X_DIR, './wasm/encrypt.wasm');
        this.encrypt_zkey = resolve(P0X_DIR, './zkey/encrypt.zkey');

        this.babyjub = await buildBabyjub();
        const keys = this.keyGen(BigInt(251))
        this.pk = keys.pk
        this.sk = keys.sk
	}

    
    // Generates a secret key between 0 ~ min(2**numBits-1, Fr size).
    keyGen(numBits: bigint): { g: EC, sk: bigint, pk: EC } {
        const sk = sampleFieldElements(this.babyjub, numBits, 1n)[0];
        return { g: this.babyjub.Base8, sk: sk, pk: this.babyjub.mulPointEscalar(this.babyjub.Base8, sk) }
    }

    // Queries the current deck from contract, shuffles & generates ZK proof locally, and updates the deck on contract.
    async shuffle(
        aggregatedPk: bigint[],
        gameId: number
    ) {
        const numBits = BigInt(251);
        const numCards = (await this.smc.numCards(gameId)).toNumber()
        let deck: Deck = await this.smc.queryDeck(gameId);
        let aggregatedPkEC = [this.babyjub.F.e(aggregatedPk[0]), this.babyjub.F.e(aggregatedPk[1])];
        let preprocessedDeck = prepareShuffleDeck(this.babyjub, deck, numCards);
        let A = samplePermutation(Number(numCards));
        let R = sampleFieldElements(this.babyjub, numBits, BigInt(numCards));
        let plaintext_output = shuffleEncryptV2Plaintext(
            this.babyjub, numCards, A, R, aggregatedPkEC,
            preprocessedDeck.X0, preprocessedDeck.X1,
            preprocessedDeck.Delta[0], preprocessedDeck.Delta[1],
            preprocessedDeck.Selector,
        );
        let shuffleEncryptV2Output = await generateShuffleEncryptV2Proof(
            aggregatedPk, A, R,
            preprocessedDeck.X0, preprocessedDeck.X1,
            preprocessedDeck.Delta[0], preprocessedDeck.Delta[1],
            preprocessedDeck.Selector,
            plaintext_output.X0, plaintext_output.X1,
            plaintext_output.delta0, plaintext_output.delta1,
            plaintext_output.selector,
            this.encrypt_wasm, this.encrypt_zkey,
        );
        let solidityProof: SolidityProof = packToSolidityProof(shuffleEncryptV2Output.proof);
        await this.smc.connect(this.gc).shuffle(
            this.owner.address,
            solidityProof,
            shuffleEncryptV2Output.publicSignals.slice(3 + numCards * 2, 3 + numCards * 3),
            shuffleEncryptV2Output.publicSignals.slice(3 + numCards * 3, 3 + numCards * 4),
            [shuffleEncryptV2Output.publicSignals[5 + numCards * 4], shuffleEncryptV2Output.publicSignals[6 + numCards * 4]],
            gameId,
        );
    }

    async deal(
        gameId: number,
        cardIdx: number,
        isFirstDecryption: boolean,
    ): Promise<bigint[]> {
        const numCards = (await this.smc.numCards(gameId)).toNumber()
        let curPlayerIdx = (await this.smc.connect(this.gc).playerIndexes(gameId)).toNumber()
        if (isFirstDecryption) {
            await dealCompressedCard(
                this.babyjub,
                numCards,
                gameId,
                cardIdx,
                curPlayerIdx,
                this.sk,
                this.pk,
                this.owner.address,
                this.gc,
                this.smc,
                this.decrypt_wasm,
                this.decrypt_zkey,
            );
            return [];
        } else {
            return await dealUncompressedCard(
                gameId,
                cardIdx,
                curPlayerIdx,
                this.sk,
                this.pk,
                this.owner.address,
                this.gc,
                this.smc,
                this.decrypt_wasm,
                this.decrypt_zkey,
            );
        }
    }

}

async function fullporcess() {
    console.log("fullporcess start...")
    const signers = await ethers.getSigners()
    const owner = signers[0];
    const gameContract = signers[10]

    // Deploy shuffle/encrypt verifier, stateMachine, gameContract
    const vk : ShuffleEncryptVerifierKey = await (new ShuffleEncryptVerifierKey__factory(owner)).deploy()
    const encrypt = await (await ethers.getContractFactory('Shuffle_encryptVerifier', {
        libraries: { ShuffleEncryptVerifierKey: vk.address }
    })).deploy();
    const decrypt = await (new DecryptVerifier__factory(owner)).deploy()
    let stateMachineContract : Shuffle = await (new Shuffle__factory(owner)).deploy(
        [{ numCards : 52, encryptVerifier : encrypt.address}], decrypt.address
    )
    await (await stateMachineContract.setGameContract(gameContract.address)).wait()


    // init shuffle game
    const numPlayers = 2
    const numCards = 52
    const gameId = 1
    stateMachineContract.connect(gameContract).setGameSettings(numPlayers, numCards, gameId);

    // init player shuffle context
    let players = []
    for (let i = 0; i < numPlayers; i++) {
        const player = new ShuffleCtx(stateMachineContract, gameContract, signers[i])
        await player.init()
        await stateMachineContract.connect(gameContract).register(
            player.owner.address, player.pk, gameId)
        players.push(player)
    }

    // players : Queries aggregated public key
    const key = await stateMachineContract.connect(players[0].owner).queryAggregatedPk(gameId);
    const aggrPK = [key[0].toBigInt(), key[1].toBigInt()];

    // shuffle stage
    enum STATE {
        Registration,
        ShufflingDeck,
        DealingCard
    }
    let state = await stateMachineContract.connect(gameContract).states(gameId)
    while(state == STATE.ShufflingDeck) {
        let index = await stateMachineContract.connect(gameContract).playerIndexes(gameId)
        players[index.toNumber()].shuffle(aggrPK, gameId)
    }

    // deal stage
    while(state != STATE.DealingCard) {
    }

    let dealNum = 0
    const NumCard2Deal = 5;
    for (let i = 0; i < NumCard2Deal; i++) {
        let index = await stateMachineContract.connect(gameContract).playerIndexes(gameId)
        players[index.toNumber()].deal(gameId, i, i==0)

        if (++dealNum % numPlayers == 0) {
            // reveal
        }
    }

}

fullporcess()
.then(() => process.exit(0))
.catch(error => {
  console.error(error);
  process.exit(1);
});
