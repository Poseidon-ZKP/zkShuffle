import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { deploy_shuffle_manager } from "../sdk/deploy";
import { ShuffleManager } from "types";

// Formal Verification : invariant

// Debug interface : set_xxx

// Storage Layout

describe('zkShuffle Unit Test', function () {
	this.timeout(6000000);

    let players : SignerWithAddress[]
    let numPlayer : number
    let sm_owner : SignerWithAddress
    let SM : ShuffleManager
    let gameId : number
	before(async () => {
        players = await ethers.getSigners()
        sm_owner = players[10];
        numPlayer = Math.ceil(Math.random() * 7 + 2)    // player 2~9
	});

    it('Deploy Shuffle Manager', async () => {
        SM = await deploy_shuffle_manager(sm_owner)
    });

    it('Create Shuffle Game', async () => {
        // const reciept = await (await SM.createShuffleGame(numPlayer)).wait()
        // console.log(reciept)
    });
});
