import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { packToSolidityProof, SolidityProof } from "@poseidon-zkp/poseidon-zk-proof/src/shuffle/proof";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BaseState, ZKShuffle } from "@poseidon-zkp/poseidon-zk-jssdk/shuffle/zkShuffle";
import { deploy_shuffle_manager } from "../helper/deploy";
import { tx_to_contract } from "../helper/utility";
import { ShuffleManager, ShuffleManager__factory, ShuffleTest, ShuffleTest__factory } from "../types";
import { resolve } from "path";
import { dnld_aws, P0X_DIR } from "@poseidon-zkp/poseidon-zk-jssdk/shuffle/utility";
import { Signer } from "ethers";

describe('ZKShuffle Unit Test', function () {
	this.timeout(6000000);

    let players : ZKShuffle[] = []
    let numPlayer : number
    let sm_owner : SignerWithAddress
    let game_owner : SignerWithAddress
    let SM : ShuffleManager
    let game : ShuffleTest
    let gameId : number
	before(async () => {
        const signers = await ethers.getSigners()
        sm_owner = signers[10];
        game_owner = signers[11];
        //numPlayer = Math.ceil(Math.random() * 8 + 1)    // player 2~9
        numPlayer = 2
        console.log("numPlayer : ", numPlayer)
        await Promise.all(
            [
                'wasm/decrypt.wasm',
                'zkey/decrypt.zkey',
                'wasm/encrypt.wasm.5',
                'zkey/encrypt.zkey.5',
                'wasm/encrypt.wasm',
                'zkey/encrypt.zkey'
            ].map(async (e) => {
                await dnld_aws(e)
            })
        )
	});

    it('Deploy Shuffle Manager', async () => {
        const signers = await ethers.getSigners()
        SM = await deploy_shuffle_manager(sm_owner)
        for (let i = 0; i < numPlayer; i++) {
            players.push(await ZKShuffle.create(
                SM.address, signers[i],
                await ZKShuffle.generateShuffleSecret(),
                resolve(P0X_DIR, './wasm/decrypt.wasm'),
                resolve(P0X_DIR, './zkey/decrypt.zkey'),
                resolve(P0X_DIR, './wasm/encrypt.wasm.5'),
                resolve(P0X_DIR, './zkey/encrypt.zkey.5')
            ))
        }
    });

    it('Deploy Dummy Game Contract', async () => {
        game = await (new ShuffleTest__factory(game_owner)).deploy(SM.address)
    });


    it('Create Shuffle Game', async () => {
        async function createShuffleGame(
            numPlayer : number,
            owner : Signer
        ) {
            const calldata = SM.interface.encodeFunctionData("createShuffleGame", [numPlayer])
            await tx_to_contract(owner, game.address, calldata)
        }

        await createShuffleGame(numPlayer, players[0].signer)
        gameId = (await SM.largestGameId()).toNumber()
        expect((await SM.gameState(gameId)).toNumber()).equal(BaseState.Created)
    });

    it('Move to Register State', async () => {
        async function moveToRegister(
            gameId : number,
            owner : Signer
        ) {
            const next = game.interface.encodeFunctionData("dummy")
            const calldata = SM.interface.encodeFunctionData("register", [gameId, next])
            await tx_to_contract(owner, game.address, calldata)
        }
        await moveToRegister(gameId, players[0].signer)
        expect((await SM.gameState(gameId)).toNumber()).equal(BaseState.Registration)
    });

    it('Player Register', async () => {
        async function playerRegister(
            gameId : number,
            signAddr : string,
            pkX : number,
            pkY : number,
            owner : Signer
        ) {
            const calldata = SM.interface.encodeFunctionData("playerRegister", [gameId, signAddr, pkX, pkY])
            await tx_to_contract(owner, game.address, calldata)
        }

        for (let i = 0; i < numPlayer; i++) {
            await playerRegister(gameId, await players[i].signer.getAddress(), players[i].pk[0], players[i].pk[1], players[i].signer)
        }
        // check dummy get call
    });

    it('Move to Shuffle', async () => {
        async function moveToShuffle(
            gameId : number,
            owner : Signer
        ) {
            const next = game.interface.encodeFunctionData("dummy")
            const calldata = SM.interface.encodeFunctionData("shuffle", [gameId, next])
            await tx_to_contract(owner, game.address, calldata)
        }
        await moveToShuffle(gameId, players[0].signer)
        expect((await SM.gameState(gameId)).toNumber()).equal(BaseState.Shuffle)
    });

    it('Player Shuffle', async () => {
        async function playerShuffle(
            gameId : number,
            player : ZKShuffle
        ) {
            const numCards = (await SM.getNumCards(gameId)).toNumber()
            let shuffleFullProof = await player.generate_shuffle_proof(gameId)
            let solidityProof: SolidityProof = packToSolidityProof(shuffleFullProof.proof);
            let compressDeck =  {
                config : await SM.cardConfig(gameId) ,
                X0 : shuffleFullProof.publicSignals.slice(3 + numCards * 2, 3 + numCards * 3),
                X1 : shuffleFullProof.publicSignals.slice(3 + numCards * 3, 3 + numCards * 4),
                selector0 : { _data : shuffleFullProof.publicSignals[5 + numCards * 4]},
                selector1 : { _data : shuffleFullProof.publicSignals[6 + numCards * 4]}
            }
            const calldata = SM.interface.encodeFunctionData("playerShuffle", [gameId, solidityProof, compressDeck])
            await tx_to_contract(player.signer, game.address, calldata)
        }

        for (let i = 0; i < numPlayer; i++) {
            console.log("Player ", i, " Shuffling")
            const start = Date.now()
            await playerShuffle(gameId, players[i])
            console.log("Player ", i, " Shuffled in ", Date.now() - start, "ms")
            // check PlayerTurn and dummy call
        }
    });

});