import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { shuffleEncryptV2Plaintext } from "@poseidon-zkp/poseidon-zk-proof/src/shuffle/plaintext";
import { dealCompressedCard, dealUncompressedCard, generateDecryptProof, generateShuffleEncryptV2Proof, packToSolidityProof, SolidityProof } from "@poseidon-zkp/poseidon-zk-proof/src/shuffle/proof";
import { prepareShuffleDeck, sampleFieldElements, samplePermutation} from "@poseidon-zkp/poseidon-zk-proof/src/shuffle/utilities";
import { ShuffleManager, ShuffleManager__factory } from "../types";
import { resolve } from 'path';
import { dnld_aws, P0X_DIR, sleep } from "./utility";

const buildBabyjub = require('circomlibjs').buildBabyjub;

// todo
export type BabyJub = any;
export type EC = any;
export type Deck = any;

export const NOT_TURN = -1
export enum BaseState {
    Uncreated,   // Important to keep this to avoid EVM default 0 value 
    Created,
    Registration,
    Shuffle,
    Deal,
    Open,
    GameError,
    Complete
}

interface IZKShuffle {
    joinGame : (gameId : number) => Promise<number>
    checkPlayerTurn : (
        gameId : number,
        playerIndex : number,
        nextBlock : number
    ) => Promise<[number, number]>
    shuffle : (gameId: number, playerIdx : number) => Promise<void>
    draw : (gameId: number) => Promise<void>
    open : (gameId: number, cardIdx : number) => Promise<void>
}

// Wrap cryptography details(pk/sk, proof generate)
// TODO : let user decide all contract call ? or anything wrapper in the ctx?
// whether dapp devloper want control. maybe 2 kinds of interface.
export class zkShuffle implements IZKShuffle {

    babyjub : any
    smc : ShuffleManager
    owner : SignerWithAddress
    pk : EC
    sk : any
    encrypt_wasm : any
    encrypt_zkey : any
    decrypt_wasm : any
    decrypt_zkey : any

    constructor(
        shuffleManagerContract : ShuffleManager,
        owner : SignerWithAddress
    ) {
        this.owner = owner
        this.smc = ShuffleManager__factory.connect(shuffleManagerContract.address, owner)
    }

	async init(
	) {
        await Promise.all(
            [
                'wasm/decrypt.wasm',
                'zkey/decrypt.zkey',
                'wasm/encrypt.wasm.2',
                'zkey/encrypt.zkey.2',
                'wasm/encrypt.wasm.5',
                'zkey/encrypt.zkey.5',
                'wasm/encrypt.wasm',
                'zkey/encrypt.zkey'
            ].map(async (e) => {
                await dnld_aws(e)
            }
        ));
        this.decrypt_wasm = resolve(P0X_DIR, './wasm/decrypt.wasm');
        this.decrypt_zkey = resolve(P0X_DIR, './zkey/decrypt.zkey');
        this.encrypt_wasm = resolve(P0X_DIR, './wasm/encrypt.wasm.5');
        this.encrypt_zkey = resolve(P0X_DIR, './zkey/encrypt.zkey.5');

        this.babyjub = await buildBabyjub();
        const keys = this.keyGen(BigInt(251))

        this.pk = [
            this.babyjub.F.toString(keys.pk[0]),
            this.babyjub.F.toString(keys.pk[1])
        ]
        this.sk = keys.sk
	}

    async joinGame(gameId : number) : Promise<number> {
        await (await this.smc.playerRegister(gameId, this.owner.address, this.pk[0], this.pk[1])).wait()
        return await this.getPlayerId(gameId)
    }

    // pull player's Id for gameId
    async getPlayerId(gameId : number) : Promise<number> {
        let nextBlock = 0
        while (1) {
            let filter = this.smc.filters.Register(null, null, null)
            let events = await this.smc.queryFilter(filter, nextBlock)
            for (let i = 0; i < events.length; i++) {
                const e = events[i];
                nextBlock = e.blockNumber - 1;
                if (e.event == 'Register' &&
                    e.args.gameId.toNumber() == gameId &&
                    e.args.playerAddr == this.owner.address)
                {
                    return e.args.playerId.toNumber()
                }
            }
            await sleep(5000)
        }
        return -1
    }

    async checkPlayerTurn(
        gameId : number,
        playerIndex : number,
        nextBlock : number
    ) : Promise<[number, number]> {
        let filter = this.smc.filters.PlayerTurn(null, null, null)
        let events = await this.smc.queryFilter(filter, nextBlock)
        for (let i = 0; i < events.length; i++) {
            const e = events[i];
            nextBlock = e.blockNumber + 1;      // TODO : probably missing event in same block
            if (e.args.gameId.toNumber() != gameId ||
                e.args.playerIndex.toNumber() != playerIndex)
            {
                continue
            }
            return [e.args.state, nextBlock]
        }
        
        return [NOT_TURN, nextBlock]
    }

    // Generates a secret key between 0 ~ min(2**numBits-1, Fr size).
    keyGen(numBits: bigint): { g: EC, sk: bigint, pk: EC } {
        const sk = sampleFieldElements(this.babyjub, numBits, 1n)[0];
        return { g: this.babyjub.Base8, sk: sk, pk: this.babyjub.mulPointEscalar(this.babyjub.Base8, sk) }
    }

    async generate_shuffle_proof(
        gameId: number
    ) {
        const numBits = BigInt(251);
        const numCards = (await this.smc.gameCardNum(gameId)).toNumber()
        const key = await this.smc.queryAggregatedPk(gameId);
        const aggrPK = [key[0].toBigInt(), key[1].toBigInt()];
        const aggrPKEC = [this.babyjub.F.e(aggrPK[0]), this.babyjub.F.e(aggrPK[1])];

        let deck = await this.smc.queryDeck(gameId);
        let preprocessedDeck = prepareShuffleDeck(this.babyjub, deck, numCards);
        let A = samplePermutation(Number(numCards));
        let R = sampleFieldElements(this.babyjub, numBits, BigInt(numCards));
        let plaintext_output = shuffleEncryptV2Plaintext(
            this.babyjub, numCards, A, R, aggrPKEC,
            preprocessedDeck.X0, preprocessedDeck.X1,
            preprocessedDeck.Delta[0], preprocessedDeck.Delta[1],
            preprocessedDeck.Selector,
        );

        return await generateShuffleEncryptV2Proof(
            aggrPK, A, R,
            preprocessedDeck.X0, preprocessedDeck.X1,
            preprocessedDeck.Delta[0], preprocessedDeck.Delta[1],
            preprocessedDeck.Selector,
            plaintext_output.X0, plaintext_output.X1,
            plaintext_output.delta0, plaintext_output.delta1,
            plaintext_output.selector,
            this.encrypt_wasm, this.encrypt_zkey,
        );
    }

    // Queries the current deck from contract, shuffles & generates ZK proof locally, and updates the deck on contract.
    async _shuffle(
        gameId: number
    ) {
        const numCards = (await this.smc.gameCardNum(gameId)).toNumber()
        let shuffleFullProof = await this.generate_shuffle_proof(gameId)
        let solidityProof: SolidityProof = packToSolidityProof(shuffleFullProof.proof);
        await this.smc.playerShuffle(
            gameId,
            solidityProof,
            {
                config : await this.smc.cardConfig(gameId) ,
                X0 : shuffleFullProof.publicSignals.slice(3 + numCards * 2, 3 + numCards * 3),
                X1 : shuffleFullProof.publicSignals.slice(3 + numCards * 3, 3 + numCards * 4),
                selector0 : { _data : shuffleFullProof.publicSignals[5 + numCards * 4]},
                selector1 : { _data : shuffleFullProof.publicSignals[6 + numCards * 4]}
            }
        );
    }

    async shuffle(
        gameId: number,
        playerIdx : any
    ) {
        const start = Date.now()
        await this._shuffle(gameId)
        console.log("Player ", playerIdx, " Shuffled in ", Date.now() - start, "ms")
    }

    async decrypt(
        gameId: number,
        cardIdx: number
    ): Promise<bigint[]> {
        const numCards = (await this.smc.gameCardNum(gameId)).toNumber()
        const isFirstDecryption = ((await this.smc.gameCardDecryptRecord(gameId, cardIdx))._data.toNumber() == 0)
        //console.log("decrypting card", cardIdx, " isFirstDecryption ", isFirstDecryption)
        let res : bigint[] = []
        if (isFirstDecryption) {
            await dealCompressedCard(
                this.babyjub,
                numCards,
                gameId,
                cardIdx,
                this.sk,
                this.pk,
                this.smc,
                this.decrypt_wasm,
                this.decrypt_zkey,
            );
        } else {
            res = await dealUncompressedCard(
                gameId,
                cardIdx,
                this.sk,
                this.pk,
                this.smc,
                this.decrypt_wasm,
                this.decrypt_zkey,
            );
        }
        //console.log("decrypting card", cardIdx, " DONE!")
        return res
    }

    async draw(
        gameId: number
    ) {
        const start = Date.now()
        let cardsToDeal = (await this.smc.queryDeck(gameId)).cardsToDeal._data.toNumber();
        await this.decrypt(gameId, Math.log2(cardsToDeal))    // TODO : multi card compatible
        console.log("Drawed in ", Date.now() - start, "ms")
    }

    async open(
        gameId: number,
        cardIdx : number
    ) {
        const start = Date.now()
        //let cardsToDeal = (await this.smc.queryDeck(gameId)).cardsToDeal
        let deck = await this.smc.queryDeck(gameId);
        let decryptProof = await generateDecryptProof(
            [
                deck.X0[cardIdx].toBigInt(),
                deck.Y0[cardIdx].toBigInt(),
                deck.X1[cardIdx].toBigInt(),
                deck.Y1[cardIdx].toBigInt()
            ],
            this.sk, this.pk, this.decrypt_wasm, this.decrypt_zkey
        );
        let solidityProof: SolidityProof = packToSolidityProof(decryptProof.proof)
        await this.smc.playerOpenCards(
            gameId,
            {
                _data : 1 << cardIdx
            },
            [
                solidityProof
            ],
            [
                {
                    X : decryptProof.publicSignals[0],
                    Y : decryptProof.publicSignals[1]
                }
            ]
        );
        console.log("Opened in ", Date.now() - start, "ms")
    }
}
