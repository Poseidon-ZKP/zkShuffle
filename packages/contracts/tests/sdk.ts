import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { ShuffleContext } from "../sdk/context";
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

    let playerId = await player.joinGame(gameId)
    console.log("Player ", owner.address.slice(0, 6).concat("...")  ,"Join Game ", gameId, " asigned playerId ", playerId)
    return

    // shuffle card
    await player.shuffle(gameId, playerId)

    // play game : whether should current player decrypt cards, in the deal/open trun
    let nextBlock = 0
    while (1) {
	    let events = await game.queryFilter({}, nextBlock)
        for (let i = 0; i < events.length; i++) {
            const e = events[i];
            nextBlock = e.blockNumber - 1;
            if (e.event == "Deal" && e.args.playerId != playerId) {
                console.log("e : ", e)
                await player.draw(gameId, e.args.cardId[0])
            } else if (e.event == "Open" && e.args.playerId == playerId) {
                console.log("e : ", e)
                await player.open(gameId, e.args.cardId[0])
            } else if (e.event == "GameEnd") {
                // game end
                console.log("Game End!!!")
                break
            }
        }
        await sleep(10000)
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

describe('SDK test', function () {
    it('SDK Full Process', async () => {
        await fullporcess()
    });
});
