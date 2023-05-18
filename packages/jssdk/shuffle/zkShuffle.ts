import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { shuffleEncryptV2Plaintext } from "@poseidon-zkp/poseidon-zk-proof/src/shuffle/plaintext";
import { dealCompressedCard, dealUncompressedCard, generateDecryptProof, generateShuffleEncryptV2Proof, packToSolidityProof, SolidityProof } from "@poseidon-zkp/poseidon-zk-proof/src/shuffle/proof";
import { prepareShuffleDeck, sampleFieldElements, samplePermutation} from "@poseidon-zkp/poseidon-zk-proof/src/shuffle/utilities";
import { resolve } from 'path';
import { dnld_aws, P0X_DIR, P0X_AWS_URL, sleep, dnld_file } from "./utility";
import { Contract, ethers } from "ethers";
import shuffleManagerJson from './ABI/ShuffleManager.json'
import { exit } from "process";

const buildBabyjub = require('circomlibjs').buildBabyjub;

export type BabyJub = any;
export type EC = any;
export type Deck = any;

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

export enum GameTurn {
    NOP, // Not Your Turn
    Shuffle, // Shuffle Turn
    Deal, // Deal Decrypt Turn
    Open, // Open Card
    Complete, // Game End
    Error, // Game Error
  }

interface IZKShuffle {
    joinGame : (gameId : number) => Promise<number>
    checkTurn : (gameId : number, startBlock : number) => Promise<GameTurn>
    shuffle : (gameId: number) => Promise<boolean>
    draw : (gameId: number) => Promise<boolean>
    open : (gameId: number, cardIds : number[]) => Promise<number[]>
    openOffchain : (gameId: number, cardIds : number[]) => Promise<number[]>

    // helper
    getPlayerId : (gameId : number) => Promise<number> 
}

export class ZKShuffle implements IZKShuffle {

    babyjub : any
    smc : Contract
    owner : SignerWithAddress
    pk : EC

    // static (local storage cache)
    sk : any
    encrypt_wasm : any
    encrypt_zkey : any
    decrypt_wasm : any
    decrypt_zkey : any

    // per game
    nextBlockPerGame : Map<number, number>

    private constructor(
        shuffleManagerContract : string,
        owner : SignerWithAddress
    ) {
        this.owner = owner

        this.smc = new ethers.Contract(shuffleManagerContract, shuffleManagerJson.abi, owner)
        this.nextBlockPerGame = new Map()
    }

    public static create = async(
        shuffleManagerContract : string,
        owner : SignerWithAddress,
        decrypt_wasm : string = "",
        decrypt_zkey : string = "",
        encrypt_wasm : string = "",
        encrypt_zkey : string = ""
    ) : Promise<ZKShuffle> => {
        const ctx = new ZKShuffle(shuffleManagerContract, owner)
        await ctx.init(decrypt_wasm, decrypt_zkey, encrypt_wasm, encrypt_zkey)
        return ctx
    }

	private async init(
        decrypt_wasm : string,
        decrypt_zkey : string,
        encrypt_wasm : string,
        encrypt_zkey : string
	) {
        this.decrypt_wasm = decrypt_wasm || await dnld_file('wasm/decrypt.wasm');
        this.decrypt_zkey = decrypt_zkey || await dnld_file('zkey/decrypt.zkey');
        this.encrypt_wasm = encrypt_wasm || await dnld_file('wasm/encrypt.wasm.5');
        this.encrypt_zkey = encrypt_zkey || await dnld_file('zkey/encrypt.zkey.5');

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
        return (await this.smc.getPlayerIdx(gameId, this.owner.address)).toNumber()
    }

    async checkTurn(
        gameId : number,
        startBlock : any = 0
    ) : Promise<GameTurn> {
        if (startBlock == undefined || startBlock == 0) {
            startBlock = this.nextBlockPerGame.get(gameId)
            if (startBlock == undefined) {
                startBlock = 0
            }
        }

        let filter = this.smc.filters.PlayerTurn(null, null, null)
        let events = await this.smc.queryFilter(filter, startBlock)
        for (let i = 0; i < events.length; i++) {
            const e = events[i];
            startBlock = e.blockNumber + 1;      // TODO : probably missing event in same block
            if (e.args.gameId.toNumber() != gameId ||
                e.args.playerIndex.toNumber() != await this.getPlayerId(gameId))
            {
                continue
            }
            this.nextBlockPerGame.set(gameId, startBlock)
            switch(e.args.state) {
                case BaseState.Shuffle :
                    return GameTurn.Shuffle
                case BaseState.Deal :
                    return GameTurn.Deal
                case BaseState.Open :
                    return GameTurn.Open
                case BaseState.Complete :
                    return GameTurn.Complete
                case BaseState.GameError :
                    return GameTurn.Error
                default :
                    console.log("err state ", e.args.state)
                    exit(-1)
            }
        }
        
        this.nextBlockPerGame.set(gameId, startBlock)
        return GameTurn.NOP
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
        const numCards = (await this.smc.getNumCards(gameId)).toNumber()
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
    private async _shuffle(
        gameId: number
    ) {
        const numCards = (await this.smc.getNumCards(gameId)).toNumber()
        let shuffleFullProof = await this.generate_shuffle_proof(gameId)
        let solidityProof: SolidityProof = packToSolidityProof(shuffleFullProof.proof);
        await (await this.smc.playerShuffle(
            gameId,
            solidityProof,
            {
                config : await this.smc.cardConfig(gameId) ,
                X0 : shuffleFullProof.publicSignals.slice(3 + numCards * 2, 3 + numCards * 3),
                X1 : shuffleFullProof.publicSignals.slice(3 + numCards * 3, 3 + numCards * 4),
                selector0 : { _data : shuffleFullProof.publicSignals[5 + numCards * 4]},
                selector1 : { _data : shuffleFullProof.publicSignals[6 + numCards * 4]}
            }
        )).wait()
    }

    async shuffle(
        gameId: number
    ): Promise<boolean> {
        const start = Date.now()
        await this._shuffle(gameId)
        console.log("Player ", await this.getPlayerId(gameId), " Shuffled in ", Date.now() - start, "ms")
        return true
    }

    async decrypt(
        gameId: number,
        cardIdx: number
    ): Promise<bigint[]> {
        const numCards = (await this.smc.getNumCards(gameId)).toNumber()
        const isFirstDecryption = ((await this.smc.getDecryptRecord(gameId, cardIdx))._data.toNumber() == 0)
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
    ) : Promise<boolean> {
        const start = Date.now()
        let cardsToDeal = (await this.smc.queryDeck(gameId)).cardsToDeal._data.toNumber();
        await this.decrypt(gameId, Math.log2(cardsToDeal))    // TODO : multi card compatible
        console.log("Player ", await this.getPlayerId(gameId)," Drawed in ", Date.now() - start, "ms")
        return true
    }

    async getOpenProof(
        gameId: number,
        cardIds : number[]
    ) {
        // remove duplicate card ids
        cardIds = cardIds.filter((v, i, a) => a.indexOf(v) === i);
        // sort card ids
        cardIds = cardIds.sort((n1,n2) => n1 - n2)
        
        const start = Date.now()
        let deck = await this.smc.queryDeck(gameId);

        let decryptedCards = []
        let proofs = []
        let cardMap = 0
            
        for (let i = 0; i < cardIds.length; i++) {
            const cardId = cardIds[i];
            cardMap += (1 << cardId)
            
            let decryptProof = await generateDecryptProof(
                [
                    deck.X0[cardId].toBigInt(),
                    deck.Y0[cardId].toBigInt(),
                    deck.X1[cardId].toBigInt(),
                    deck.Y1[cardId].toBigInt()
                ],
                this.sk, this.pk, this.decrypt_wasm, this.decrypt_zkey
            );
            decryptedCards.push({
                X : decryptProof.publicSignals[0],
                Y : decryptProof.publicSignals[1]
            })

            proofs.push(packToSolidityProof(decryptProof.proof))
        }
        console.log("Opened in ", Date.now() - start, "ms")
        return {
            cardMap : cardMap,
            decryptedCards : decryptedCards,
            proofs : proofs
        }
    }


    async openOffchain(
        gameId: number,
        cardIds : number[]
    ) : Promise<number[]> {
        const {cardMap, decryptedCards, proofs} = await this.getOpenProof(gameId, cardIds)
        return [0]  // TODO : search on-chain after PR21
    }

    async open(
        gameId: number,
        cardIds : number[]
    ) : Promise<number[]> {

        const {cardMap, decryptedCards, proofs} = await this.getOpenProof(gameId, cardIds)
        await (await this.smc.playerOpenCards(
            gameId,
            {
                _data : cardMap
            },
            proofs,
            decryptedCards
        )).wait()
        return [0]  // TODO : search on-chain after PR21
    }
}
