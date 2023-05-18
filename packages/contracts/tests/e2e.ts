import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { exit } from "process";
import { GameTurn, ZKShuffle } from "@poseidon-zkp/poseidon-zk-jssdk/shuffle/zkShuffle";
import { Hilo, Hilo__factory, ShuffleManager } from "../types";
import { deploy_shuffle_manager } from "../helper/deploy";
import { dnld_aws, P0X_DIR, sleep } from "@poseidon-zkp/poseidon-zk-jssdk/shuffle/utility";
import { resolve } from "path";

async function player_run(
    SM : ShuffleManager,
    owner : SignerWithAddress,
    gameId : number
) {
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

    console.log("Player ", owner.address.slice(0, 6).concat("..."), "init shuffle context!")
    const player = await ZKShuffle.create(
        SM.address, owner,
        await ZKShuffle.generateShuffleSecret(),
        resolve(P0X_DIR, './wasm/decrypt.wasm'),
        resolve(P0X_DIR, './zkey/decrypt.zkey'),
        resolve(P0X_DIR, './wasm/encrypt.wasm.5'),
        resolve(P0X_DIR, './zkey/encrypt.zkey.5')
    )

    // join Game
    let playerIdx = await player.joinGame(gameId)
    console.log("Player ", owner.address.slice(0, 6).concat("...")  ,"Join Game ", gameId, " asigned playerId ", playerIdx)

    // play game
    let turn = GameTurn.NOP
    while (turn != GameTurn.Complete) {
        turn = await player.checkTurn(gameId)

        //console.log("player ", playerIdx, " state : ", state, " nextBlock ", nextBlock)
        if (turn != GameTurn.NOP) {
            switch(turn) {
                case GameTurn.Shuffle :
                    console.log("Player ", playerIdx, " 's Shuffle turn!")
                    await player.shuffle(gameId)
                    break
                case GameTurn.Deal :
                    console.log("Player ", playerIdx, " 's Deal Decrypt turn!")
                    await player.draw(gameId)
                    break
                case GameTurn.Open :
                    console.log("Player ", playerIdx, " 's Open Decrypt turn!")
                    let cards = await player.openOffchain(gameId, [playerIdx])
                    console.log("Player ", playerIdx, " open offchain hand card ", cards[0])
                    cards = await player.open(gameId, [playerIdx])
                    console.log("Player ", playerIdx, " open onchain hand card ", cards[0])
                    break
                case GameTurn.Complete :
                    console.log("Player ", playerIdx, " 's Game End!")
                    break
                default :
                    console.log("err turn ", turn)
                    exit(-1)
            }
        }

        await sleep(1000)
    }
}

async function fullprocess() {
    const signers = await ethers.getSigners()
    const sm_owner = signers[10];
    const hilo_owner = signers[11];
    const players = signers
    // deploy shuffleManager
    const SM : ShuffleManager = await deploy_shuffle_manager(sm_owner)

    // deploy gameContract
    const game : Hilo = await (new Hilo__factory(hilo_owner)).deploy(SM.address)

    // Hilo.newGame
    await (await game.connect(players[0]).newGame()).wait()
    const gameId = (await game.largestGameId()).toNumber()  // TODO : get gameId from reciept.
    console.log("Player ", players[0].address.slice(0, 6).concat("..."),  "Create Game ", gameId)

    // allow Join Game
    await (await game.connect(players[0]).allowJoinGame(gameId)).wait()

    await Promise.all(
        [
            player_run(SM, players[0], gameId),
            player_run(SM, players[1], gameId)
        ]
    );
}

describe('ZKShuffle E2E test', function () {
    it('Hilo E2E', async () => {
        await fullprocess()
    });
});
