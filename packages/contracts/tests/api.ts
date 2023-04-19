import { ethers } from "hardhat";
import { DecryptVerifier__factory, Game, Game__factory, IGame, IShuffle__factory, Shuffle, ShuffleEncryptVerifierKey, ShuffleEncryptVerifierKey__factory, Shuffle__factory} from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ShuffleContext } from "../sdk/context";

enum Type {
    DEAL,
    OPEN
}
    
enum ActionState {
    NOTSTART,
    ONGOING,
    DONE
}

async function player_run(
    game : Game,
    owner : SignerWithAddress,
    gameId : number
) {
    console.log("Player ", owner.address, " init shuffle context!")
    const shuffle = IShuffle__factory.connect(await game.shuffleContract(), owner)

    const player = new ShuffleContext(shuffle, game, owner)
    await player.init()

    const reciept : any = await (await game.connect(owner).joinGame(
        player.owner.address, player.pk, gameId, {gasLimit : 10000000})).wait()
    const playerId = reciept.events[0].args.playerId.toNumber()
    console.log("Player ", playerId, " Join Game")

    // pull on-chain status, whether should current player decrypt cards, in the deal/open trun
    let block = 0
    while (1) {
	    //let filter = shuffle.filters.Deal(null, null, null).topics.concat(shuffle.filters.Open(null, null, null).topics)
	    let events = await shuffle.queryFilter({}, block)
        for (let i = 0; i < events.length; i++) {
            const e = events[i];
            
        }
	    //let [ethAddr,Key, amount2] = events[0].args
        // block = 

    }
}

async function deploy_shuffle(owner : SignerWithAddress) {
    // Deploy shuffle/encrypt verifier, shuffle stateMachine, game Contract
    const vk : ShuffleEncryptVerifierKey = await (new ShuffleEncryptVerifierKey__factory(owner)).deploy()
    const encrypt = await (await ethers.getContractFactory('Shuffle_encryptVerifier', {
        libraries: { ShuffleEncryptVerifierKey: vk.address }
    })).deploy();
    const decrypt = await (new DecryptVerifier__factory(owner)).deploy()
    let smc : Shuffle = await (new Shuffle__factory(owner)).deploy(
        [{ numCards : 52, encryptVerifier : encrypt.address}], decrypt.address
    )

    console.log("Deploy Contracts : shuffle/encrypt verifier, stateMachine")
    return smc
}

async function fullporcess() {
    const players = await ethers.getSigners()
    const owner = players[10];
    let smc = await deploy_shuffle(owner)

    const game : Game = await (new Game__factory(owner)).deploy(smc.address)
    await (await smc.setGameContract(game.address)).wait()

    // init shuffle game
    const numPlayers = 2
    const numCards = 52
    const actions = [
        {
            // Deal card 0 to player 0
            t : Type.DEAL,
            state : ActionState.NOTSTART,
            cardIdx : 0,
            playerIdx : 0
        },
        {
            // Deal card 1 to player 1
            t : Type.DEAL,
            state : ActionState.NOTSTART,
            cardIdx : 1,
            playerIdx : 1
        },
        {
            // ask player 0 open card 0
            t : Type.OPEN,
            state : ActionState.NOTSTART,
            cardIdx : 0,
            playerIdx : 0
        },
        {
            // ask player 1 open card 1
            t : Type.OPEN,
            state : ActionState.NOTSTART,
            cardIdx : 1,
            playerIdx : 1
        },
    ]
    // who create game ? one of the player.
    await (await game.connect(players[0]).newGame(numCards, numPlayers, actions)).wait()
    const gameId = (await game.nextGameId()).sub(1).toNumber()
    console.log("Player 0 Create Game ", gameId, " : ", numPlayers, " Players, ", numCards, " Cards")

    await Promise.all(
        [
            player_run(game, players[0], gameId),
            player_run(game, players[1], gameId)
        ]
    );
}

describe('Shuffle test', function () {
    it('Shuffle Full Process', async () => {
        await fullporcess()
    });
});
