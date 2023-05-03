import { sign } from "crypto";
import { ethers } from "hardhat";
import { Hilo, Hilo__factory, ShuffleManager } from "../types";
import { deploy_shuffle_manager } from "./deploy";

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

    // shuffle.playerRegister

    // shuffle.shuffle

    // shuffle.draw/open


}

describe('SDK test', function () {
    it('SDK Full Process', async () => {
        await fullporcess()
    });
});
