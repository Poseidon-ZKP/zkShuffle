import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { exit } from "process";
import { BaseState, NOT_TURN, ShuffleContext, sleep } from "../sdk/context";
import {
  HiloGame,
  HiloGame__factory,
  ShuffleManager,
  ShuffleManager__factory,
} from "../types";
import { deploy_shuffle_manager } from "../sdk/deploy";

class HiloGameContext {
  hilo: HiloGame;
  owner: SignerWithAddress;

  constructor(hiloGame: HiloGame, owner: SignerWithAddress) {
    this.owner = owner;
    this.hilo = HiloGame__factory.connect(hiloGame.address, owner);
  }

  async guess(hiloId: number, guess: number) {
    await (await this.hilo.guess(hiloId, guess)).wait();
  }

  async checkPlayerGuessed(hiloId: number, playerId: number) {
    const result = await this.hilo.isPlayerGuessed(hiloId, playerId);
    return result;
  }

  async isGuessRight(hiloId: number, playerId: number) {
    return await this.hilo.isGuessRight(hiloId, playerId);
  }
}

async function player_run(
  SM: ShuffleManager,
  hilo: HiloGame,
  owner: SignerWithAddress,
  hiloId: number,
  gameId: number
) {
  console.log(
    "Player ",
    owner.address.slice(0, 6).concat("..."),
    "init shuffle context!"
  );
  const playerShuffle = new ShuffleContext(SM, owner);
  await playerShuffle.init();

  console.log(
    "Player ",
    owner.address.slice(0, 6).concat("..."),
    "init hilo context!"
  );
  const playerHilo = new HiloGameContext(hilo, owner);

  // join Game
  let playerIdx = await playerShuffle.joinGame(gameId);
  console.log(
    "Player ",
    owner.address.slice(0, 6).concat("..."),
    "Join Game ",
    gameId,
    " asigned playerId ",
    playerIdx
  );

  // play game
  let shuffleNextBlock = 0;
  let shuffleState;
  let guessed = false;

  while (shuffleState != BaseState.Complete) {
    [shuffleState, shuffleNextBlock] = await playerShuffle.checkPlayerTurn(
      gameId,
      playerIdx,
      shuffleNextBlock
    );
    guessed = await playerHilo.checkPlayerGuessed(hiloId, playerIdx);

    //console.log("player ", playerIdx, " shuffleState : ", shuffleState, " shuffleNextBlock ", shuffleNextBlock)
    if (shuffleState != NOT_TURN) {
      switch (shuffleState) {
        case BaseState.Shuffle:
          console.log("Player ", playerIdx, " 's Shuffle turn!");
          await playerShuffle.shuffle(gameId, playerIdx);
          break;
        case BaseState.Deal:
          console.log("Player ", playerIdx, " 's Deal Decrypt turn!");
          await playerShuffle.draw(gameId);
          if (!guessed) {
            console.log("Player ", playerIdx, " 's guess turn!");
            await playerHilo.guess(hiloId, 1);
          }
          break;
        case BaseState.Open:
          if (guessed) {
            console.log("Player ", playerIdx, " 's Open Decrypt turn!");
            await playerShuffle.open(gameId, playerIdx);
          }
          break;
        case BaseState.Complete:
          console.log("Player ", playerIdx, " 's Game End!");
          break;
        default:
          console.log("err shuffleState ", shuffleState);
          exit(-1);
      }
    }
    await sleep(1000);
  }

  const cardValue = await playerShuffle.queryCardValue(gameId, playerIdx);
  const result = await playerHilo.isGuessRight(hiloId, playerIdx);

  console.log(
    `player ${playerIdx}'s card value is ${cardValue}, result is ${result}`
  );
}

async function fullprocess() {
  const [sm_owner, hilo_owner, Alice, Bob] = await ethers.getSigners();
  // deploy shuffleManager
  const SM: ShuffleManager = await deploy_shuffle_manager(sm_owner);

  // deploy gameContract
  const game: HiloGame = await new HiloGame__factory(hilo_owner).deploy(
    SM.address
  );

  // Alice create game
  const createGameTx = await game.connect(Alice).createGame();
  const createGameEvent = await createGameTx.wait().then((receipt: any) => {
    return receipt.events[0].args;
  });
  const hiloId = Number(createGameEvent.hiloId);
  const shuffleGameId = Number(createGameEvent.shuffleGameId);
  console.log(
    `Player ${Alice.address} Creates Game, hiloId is ${hiloId}, shuffleGameId is ${shuffleGameId}`
  );

  await Promise.all([
    player_run(SM, game, Alice, hiloId, shuffleGameId),
    player_run(SM, game, Bob, hiloId, shuffleGameId),
  ]);
}

describe("hilo test", function () {
  it("Hilo", async () => {
    await fullprocess();
  });
});
