import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { exit } from "process";
import { BaseState, NOT_TURN, zkShuffle } from "@poseidon-zkp/poseidon-zk-jssdk/shuffle/zkShuffle";
import { Hilo, Hilo__factory, ShuffleManager } from "../types";
import { deploy_shuffle_manager } from "../sdk/deploy";
import { sleep } from "@poseidon-zkp/poseidon-zk-jssdk/shuffle/utility";

async function player_run(
    SM : ShuffleManager,
    owner : SignerWithAddress,
    gameId : number
) {
    console.log("Player ", owner.address.slice(0, 6).concat("..."), "init shuffle context!")
    const player = await zkShuffle.create(SM.address, owner)

    // join Game
    let playerIdx = await player.joinGame(gameId)
    console.log("Player ", owner.address.slice(0, 6).concat("...")  ,"Join Game ", gameId, " asigned playerId ", playerIdx)

    // play game
    let state
    while (state != BaseState.Complete) {
        state = await player.checkTurn(gameId)

        //console.log("player ", playerIdx, " state : ", state, " nextBlock ", nextBlock)
        if (state != NOT_TURN) {
            switch(state) {
                case BaseState.Shuffle :
                    console.log("Player ", playerIdx, " 's Shuffle turn!")
                    await player.shuffle(gameId)
                    break
                case BaseState.Deal :
                    console.log("Player ", playerIdx, " 's Deal Decrypt turn!")
                    await player.draw(gameId)
                    break
                case BaseState.Open :
                    console.log("Player ", playerIdx, " 's Open Decrypt turn!")
                    await player.open(gameId, [playerIdx])
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

describe('zkShuffle E2E test', function () {
    it('Hilo E2E', async () => {
        await fullprocess()
    });
});
