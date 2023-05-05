import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { deploy_shuffle_manager } from "../sdk/deploy";
import { tx_to_contract } from "../sdk/utility";
import { ShuffleManager, ShuffleTest, ShuffleTest__factory } from "../types";

// Formal Verification : invariant

// Debug interface : set_xxx

// Storage Layout


describe('zkShuffle Unit Test', function () {
	this.timeout(6000000);

    let players : SignerWithAddress[]
    let numPlayer : number
    let sm_owner : SignerWithAddress
    let game_owner : SignerWithAddress
    let SM : ShuffleManager
    let game : ShuffleTest
    let gameId : number
	before(async () => {
        players = await ethers.getSigners()
        sm_owner = players[10];
        game_owner = players[11];
        numPlayer = Math.ceil(Math.random() * 7 + 2)    // player 2~9
	});

    it('Deploy Shuffle Manager', async () => {
        SM = await deploy_shuffle_manager(sm_owner)
    });

    it('Deploy Dummy Game Contract', async () => {
        game = await (new ShuffleTest__factory(game_owner)).deploy(SM.address)
    });


    async function createShuffleGame(
        owner : SignerWithAddress,
        numPlayer : number
    ) {
        const calldata = SM.interface.encodeFunctionData("createShuffleGame", [numPlayer])
        await tx_to_contract(owner, game.address, calldata)
    }

    it('Create Shuffle Game', async () => {
        await createShuffleGame(players[0], numPlayer)
    });
});
