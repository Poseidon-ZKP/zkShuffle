import { ethers } from "hardhat";
import { DecryptVerifier__factory, Game, Game__factory, IGame, IShuffle__factory, Shuffle, ShuffleEncryptVerifierKey, ShuffleEncryptVerifierKey__factory, Shuffle_encryptPairing5Card__factory, Shuffle_encryptVerifier5Card__factory, Shuffle__factory} from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ShuffleContext, sleep } from "../sdk/context";

async function player_run(
    game : Game,
    owner : SignerWithAddress,
    gameId : number
) {
    console.log("Player ", owner.address.slice(0, 6).concat("..."), "init shuffle context!")
    const shuffle = IShuffle__factory.connect(await game.shuffleContract(), owner)

    const player = new ShuffleContext(shuffle, game, owner)
    await player.init()

    await (await game.connect(owner).joinGame(
        player.owner.address, player.pk, gameId, {gasLimit : 10000000})).wait()

    let playerId = await player.getPlayerId(gameId)
    console.log("Player ", owner.address.slice(0, 6).concat("...")  ,"Join Game ", gameId, " asigned playerId ", playerId)

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

async function deploy_shuffle(owner : SignerWithAddress) {
    const encrypt  = await (new Shuffle_encryptVerifier5Card__factory(owner)).deploy()
    const decrypt = await (new DecryptVerifier__factory(owner)).deploy()
    let smc : Shuffle = await (new Shuffle__factory(owner)).deploy(
        [{ numCards : 5, encryptVerifier : encrypt.address}], decrypt.address
    )

    console.log("Deploy Contracts : shuffle/encrypt verifier, stateMachine")
    return smc
}

async function fullporcess() {
    const players = await ethers.getSigners()
    const owner = players[10];
    let smc = await deploy_shuffle(owner)

    const numCards = 5
    const game : Game = await (new Game__factory(owner)).deploy(smc.address, numCards)
    await (await smc.setGameContract(game.address)).wait()

    // init shuffle game
    const numPlayers = 2
    // any player can create game
    await (await game.connect(players[0]).newGame(numPlayers)).wait()
    const gameId = (await game.nextGameId()).sub(1).toNumber()
    console.log("Player ", players[0].address.slice(0, 6).concat("..."),  "Create Game ", gameId, " : ", numPlayers, " Players, ")

    await Promise.all(
        [
            player_run(game, players[0], gameId),
            player_run(game, players[1], gameId)
        ]
    );
}

describe('SDK test', function () {
    it('SDK Full Process', async () => {
        await fullporcess()
    });
});
