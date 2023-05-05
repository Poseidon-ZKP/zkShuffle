import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { exit } from "process";
import { BaseState, NOT_TRUN, ShuffleContext, sleep } from "../sdk/context";
import { Hilo, Hilo__factory, ShuffleManager, ShuffleManager__factory } from "../types";
import { deploy_shuffle_manager } from "./deploy";

async function player_run(
    SM : ShuffleManager,
    owner : SignerWithAddress,
    gameId : number
) {
    console.log("Player ", owner.address.slice(0, 6).concat("..."), "init shuffle context!")
    const player = new ShuffleContext(SM, owner)
    await player.init()

    // join Game
    let playerIdx = await player.joinGame(gameId)
    console.log("Player ", owner.address.slice(0, 6).concat("...")  ,"Join Game ", gameId, " asigned playerId ", playerIdx)

    // play game
    let nextBlock = 0
    let state
    while (state != BaseState.Complete) {
        [state, nextBlock] = await player.checkPlayerTurn(gameId, playerIdx, nextBlock)

        //console.log("player ", playerIdx, " state : ", state, " nextBlock ", nextBlock)
        if (state != NOT_TRUN) {
            switch(state) {
                case BaseState.Shuffle :
                    console.log("Player ", playerIdx, " 's Shuffle turn!")
                    await player.shuffle(gameId, playerIdx)
                    break
                case BaseState.Deal :
                    console.log("Player ", playerIdx, " 's Deal Decrypt turn!")
                    await player.draw(gameId)
                    break
                case BaseState.Open :
                    console.log("Player ", playerIdx, " 's Open Decrypt turn!")
                    await player.open(gameId, playerIdx)
                    break
                case BaseState.Complete :
                    console.log("Player ", playerIdx, " 's Game End!")
                    break
                default :
                    console.log("err state ", state)
                    exit(-1)
            }
        }


        await sleep(1000)
    }
}

async function fullporcess() {
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
    const gameId = (await game.largestGameId()).toNumber()
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

describe('E2E test', function () {
    it('ShuffleManager E2E', async () => {
        await fullporcess()
    });
});
