import { ethers } from "hardhat";
import { DecryptVerifier__factory, Shuffle, ShuffleEncryptVerifierKey, ShuffleEncryptVerifierKey__factory, Shuffle__factory} from "../types";
import {ShuffleContext} from "../sdk/context"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish } from "ethers";
import { exit } from "process";

// shuffle stage
enum STATE {
    Registration,
    ShufflingDeck,
    DealingCard
}

async function player_logic(smc : Shuffle, gc : SignerWithAddress, owner : SignerWithAddress, gameId : BigNumber) {
    const player = new ShuffleContext(smc, gc, owner)
    await player.init()

    const reciept : any = await (await smc.connect(gc).register(
        player.owner.address, player.pk, gameId)).wait()
    const playerId = reciept.events[0].args.playerId.toNumber()
    console.log("Player ", playerId, " Register PK ")

    while(await smc.connect(gc).states(gameId)  != STATE.ShufflingDeck) {
    }

    const key = await smc.connect(player.owner).queryAggregatedPk(gameId);
    const aggrPK = [key[0].toBigInt(), key[1].toBigInt()];

    while(await smc.connect(gc).states(gameId) == STATE.ShufflingDeck) {
        let index = await smc.connect(gc).playerIndexes(gameId)
        if (index == playerId) {
            await player.shuffle(aggrPK, gameId.toNumber())
            console.log("player ", index.toNumber(), " shuffle")
        }
    }

    while(await smc.connect(gc).states(gameId) == STATE.DealingCard) {
        let index = await smc.connect(gc).playerIndexes(gameId)
        if (index == playerId) {
            const cardIdx = 0
            await player.deal(gameId.toNumber(), cardIdx, cardIdx==0)
            console.log("player ", index.toNumber(), " shuffle")

            // 1st player reveal
        }
    }
}

async function fullporcess() {
    const signers = await ethers.getSigners()
    const owner = signers[10];
    const gc = signers[11]    // gameContract

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
    smc.connect(gc).setGameSettings(numPlayers, numCards, gameId);
    console.log("Init Game ", gameId, " : ", numPlayers, " Players, ", numCards, " Cards")

    // await player_logic(smc,gc,signers[0], gameId)
    // exit(0)

    // init player shuffle context
    let players = []
    for (let i = 0; i < numPlayers; i++) {
        const player = new ShuffleContext(smc, gc, signers[i])
        await player.init()
        console.log("Player ", i, " Init Shuffle Context")

        await smc.connect(gc).register(
            player.owner.address, player.pk, gameId)
        console.log("Player ", i, " Register PK ")
        players.push(player)
    }

    // players : Queries aggregated public key
    const key = await smc.connect(players[0].owner).queryAggregatedPk(gameId);
    const aggrPK = [key[0].toBigInt(), key[1].toBigInt()];
    console.log("Player Query aggr PK ")

    while(await smc.connect(gc).states(gameId)  != STATE.ShufflingDeck) {
    }
    while(await smc.connect(gc).states(gameId) == STATE.ShufflingDeck) {
        let index = await smc.connect(gc).playerIndexes(gameId)
        await players[index.toNumber()].shuffle(aggrPK, gameId)
        console.log("player ", index.toNumber(), " shuffle")
    }

    // deal stage
    while(await smc.connect(gc).states(gameId) != STATE.DealingCard) {
        // wait
    }

    const NumCard2Deal = 5;
    for (let i = 0; i < NumCard2Deal; i++) {
        
        for (let j = 0; j < numPlayers; j++) {
            let index = await smc.connect(gc).playerIndexes(gameId)
            players[index.toNumber()].deal(gameId, i, i==0)

            if (j == numPlayers - 1) {
                // reveal
                console.log("reveal card ", i)
            }
        }
    }

}

describe('Shuffle test', function () {
    it('Shuffle Full Process', async () => {
        await fullporcess()
    });
});
