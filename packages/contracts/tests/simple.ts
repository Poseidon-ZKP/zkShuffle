import { ethers } from "hardhat";
import { DecryptVerifier__factory, Shuffle, ShuffleEncryptVerifierKey, ShuffleEncryptVerifierKey__factory, Shuffle__factory} from "../types";
import {ShuffleContext} from "../sdk/context"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// shuffle stage
enum STATE {
    Registration,
    ShufflingDeck,
    DealingCard
}

export async function sleep(ms : number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function player_run(smc : Shuffle, gc : SignerWithAddress, owner : SignerWithAddress, gameId : number) {
    console.log("Player ", owner.address, " init shuffle context!")
    const player = new ShuffleContext(smc, gc, owner)
    await player.init()

    const reciept : any = await (await smc.connect(gc).register(
        player.owner.address, player.pk, gameId, {gasLimit : 10000000})).wait()
    const playerId = reciept.events[0].args.playerId.toNumber()
    console.log("Player ", playerId, " Register PK ")

    while((await smc.states(gameId))  != STATE.ShufflingDeck) {
        console.log("Player ", playerId, "wait for shuffle state ready!")
        await sleep(1000)
    }

    while(await smc.states(gameId) == STATE.ShufflingDeck) {
        if (await smc.playerIndexes(gameId) == playerId) {
            console.log("player ", playerId, " shuffle...")
            await player.shuffle(gameId)
        }
    }

    while(await smc.connect(gc).states(gameId) == STATE.DealingCard) {
        const cardIdx = 0 //
        if (palyer == gameContract.curPlayerIdx) {
            await player.deal(gameId, cardIdx)  // 0/1, 2, 3, 4
            // deal :
            // (1) 
        } 
        console.log("player ", playerId, " shuffle")

            // 1st player reveal
    }
}

async function fullporcess() {
    const signers = await ethers.getSigners()
    const owner = signers[10];
    const gc = signers[11]    // user-define gameContract

    // Deploy shuffle/encrypt verifier, stateMachine, gc
    const vk : ShuffleEncryptVerifierKey = await (new ShuffleEncryptVerifierKey__factory(owner)).deploy()
    const encrypt = await (await ethers.getContractFactory('Shuffle_encryptVerifier', {
        libraries: { ShuffleEncryptVerifierKey: vk.address }
    })).deploy();
    const decrypt = await (new DecryptVerifier__factory(owner)).deploy()
    let smc : Shuffle = await (new Shuffle__factory(owner)).deploy(
        [{ numCards : 52, encryptVerifier : encrypt.address}], decrypt.address
    )
    await (await smc.setGameContract(gc.address)).wait()
    console.log("Deploy Contracts : shuffle/encrypt verifier, stateMachine, gc")

    // init shuffle game
    const numPlayers = 2
    const numCards = 52
    const gameId = 1
    smc.connect(gc).setGameSettings(numPlayers, numCards, gameId, 2, 5);
    console.log("Init Game ", gameId, " : ", numPlayers, " Players, ", numCards, " Cards")

    await Promise.all(
        [
            player_run(smc,gc,signers[0], gameId),
            player_run(smc,gc,signers[1], gameId)
        ]
    );

}

describe('Shuffle test', function () {
    it('Shuffle Full Process', async () => {
        await fullporcess()
    });
});
