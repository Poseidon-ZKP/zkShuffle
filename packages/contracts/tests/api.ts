import { ethers } from "hardhat";
import { DecryptVerifier__factory, Shuffle, ShuffleEncryptVerifierKey, ShuffleEncryptVerifierKey__factory, Shuffle__factory} from "../types";
import {ShuffleContext} from "../sdk/context"

async function fullporcess() {
    const signers = await ethers.getSigners()
    const owner = signers[0];
    const gc = signers[10]    // gameContract

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

    // shuffle stage
    enum STATE {
        Registration,
        ShufflingDeck,
        DealingCard
    }
    let state
    while((state = await smc.connect(gc).states(gameId))  != STATE.ShufflingDeck) {
    }
    while((state = await smc.connect(gc).states(gameId)) == STATE.ShufflingDeck) {
        let index = await smc.connect(gc).playerIndexes(gameId)
        await players[index.toNumber()].shuffle(aggrPK, gameId)
        console.log("player ", index.toNumber(), " shuffle")
    }

    // deal stage
    while((state = await smc.connect(gc).states(gameId)) != STATE.DealingCard) {
        // wait
    }

    let dealNum = 0
    const NumCard2Deal = 5;
    for (let i = 0; i < NumCard2Deal; i++) {
        let index = await smc.connect(gc).playerIndexes(gameId)
        players[index.toNumber()].deal(gameId, i, i==0)

        if (++dealNum % numPlayers == 0) {
            // reveal
        }
    }

}

describe('Shuffle test', function () {
    it('Shuffle Full Process', async () => {
        await fullporcess()
    });
});
