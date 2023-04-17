import { ethers } from "hardhat";
import { DecryptVerifier__factory, Game, Shuffle, ShuffleEncryptVerifierKey, ShuffleEncryptVerifierKey__factory, Shuffle__factory} from "../types";
import { Game__factory } from "types/factories/contracts/game/Card.sol";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

enum Type {
    DEAL,
    OPEN
}
    
enum ActionState {
    NOTSTART,
    ONGOING,
    DONE
}

async function deploy_shuffle(owner : SignerWithAddress) {
    // Deploy shuffle/encrypt verifier, stateMachine, gc
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

async function player_run(
    game : Game,
    owner : SignerWithAddress,
    gameId : number
) {

}

async function fullporcess() {
    const signers = await ethers.getSigners()
    const owner = signers[10];
    let smc = await deploy_shuffle(owner)

    const game = await (new Game__factory(owner)).deploy(smc.address)
    //await (await smc.setGameContract(game.address)).wait()

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
    await (await game.newGame(numCards, numPlayers, actions)).wait()
    const gameId = await game.gameId()
    console.log("Init Game ", gameId, " : ", numPlayers, " Players, ", numCards, " Cards")


    await Promise.all(
        [
            player_run(game,signers[0], gameId),
            player_run(game,signers[1], gameId)
        ]
    );

}

describe('Shuffle test', function () {
    it('Shuffle Full Process', async () => {
        await fullporcess()
    });
});
