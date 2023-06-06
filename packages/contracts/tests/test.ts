import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BaseState, ZKShuffle } from "@poseidon-zkp/poseidon-zk-jssdk/src/shuffle/zkShuffle";
import { deploy_shuffle_test } from "../helper/deploy";
import { ShuffleManager__factory } from "../types";
import { resolve } from "path";
import { dnld_aws, P0X_DIR } from "@poseidon-zkp/poseidon-zk-jssdk/src/shuffle/utility";

describe("ZKShuffle State Less Unit Test", function () {
  let sm_owner: SignerWithAddress;
  let game_owner: SignerWithAddress;
  let signers: SignerWithAddress[];
  before(async () => {
    signers = await ethers.getSigners();
    sm_owner = signers[10];
    game_owner = signers[11];
    await Promise.all(
      [
        "wasm/decrypt.wasm",
        "zkey/decrypt.zkey",
        "wasm/encrypt.wasm.5",
        "zkey/encrypt.zkey.5",
        "wasm/encrypt.wasm",
        "zkey/encrypt.zkey",
      ].map(async (e) => {
        await dnld_aws(e);
      }),
    );
  });

  it("Player Register StateLess", async () => {
    const SM = await deploy_shuffle_test(sm_owner);
    const gameId = 1;
    const numCards = 5;
    const numPlayers = 2;
    let players: ZKShuffle[] = [];
    for (let i = 0; i < 9; i++) {
      players.push(
        await ZKShuffle.create(
          SM.address,
          signers[i],
          await ZKShuffle.generateShuffleSecret(),
          resolve(P0X_DIR, "./wasm/decrypt.wasm"),
          resolve(P0X_DIR, "./zkey/decrypt.zkey"),
          resolve(P0X_DIR, "./wasm/encrypt.wasm.5"),
          resolve(P0X_DIR, "./zkey/encrypt.zkey.5"),
        ),
      );
    }

    //  prerequisite 1 : Init Game Info
    await SM.set_gameInfo(gameId, numCards, numPlayers);

    //  prerequisite 2 : Init Game State : Registration
    await SM.set_gameState(gameId, BaseState.Registration);
    expect((await SM.gameState(gameId)).toNumber()).equal(BaseState.Registration);

    // player 0 Register
    async function playerRegister(pid: number) {
      const player: ZKShuffle = players[pid];
      // check Register Event
      return await ShuffleManager__factory.connect(SM.address, player.signer).playerRegister(
        gameId,
        await player.signer.getAddress(),
        player.pk[0],
        player.pk[1],
      );
    }

    await expect(playerRegister(0))
      .to.emit(SM, "Register")
      .withArgs(gameId, 0, await players[0].signer.getAddress());
    await expect(playerRegister(1))
      .to.emit(SM, "Register")
      .withArgs(gameId, 1, await players[1].signer.getAddress());

    // check Game Full
    await expect(playerRegister(2)).to.be.revertedWith("Game full");
  });
});
