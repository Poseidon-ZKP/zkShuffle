import { ethers } from "hardhat";
import { zkShuffle } from "../sdk/zkShuffle";
import { ShuffleManager } from "../types/artifacts/cache/solpp-generated-contracts/shuffle/ShuffleManager";
import { deploy_shuffle_manager } from "../sdk/deploy";
import { HearthStone } from "../types/artifacts/cache/solpp-generated-contracts/examples";
import { HearthStone__factory } from "../types/factories/artifacts/cache/solpp-generated-contracts/examples";

async function fullprocess() {
  const [shuffle_manager_owner, ks_owner, Alice, Bob] =
    await ethers.getSigners();

  console.log(`Alice ${Alice.address}, Bob ${Bob.address}`);
  // deploy shuffleManager
  const shuffle: ShuffleManager = await deploy_shuffle_manager(
    shuffle_manager_owner
  );

  const hs: HearthStone = await new HearthStone__factory(ks_owner).deploy(
    shuffle.address
  );
  console.log(
    `deployed shuffleManager at ${shuffle.address}, hs at ${hs.address}`
  );

  // init shuffle context, which packages the ShuffleManager contract

  // Alice init shuffle
  const aliceShuffle = new zkShuffle(shuffle, Alice);
  await aliceShuffle.init();

  // Bob init shuffle
  const bobShuffle = new zkShuffle(shuffle, Bob);
  await bobShuffle.init();

  // Alice create game
  const creatorTx = await hs
    .connect(Alice)
    .createShuffleForCreator(aliceShuffle.pk[0], aliceShuffle.pk[1]);
  const creatorEvent = await creatorTx.wait().then((receipt: any) => {
    for (const event of receipt.events) {
      if (event.topics[0] == hs.filters.CreateGame(null, null).topics) {
        return event.args;
      }
    }
  });
  const hsId = Number(creatorEvent.hsId);
  const shuffleId1 = Number(creatorEvent.shuffleId);

  // Bob join the game
  const joinerTx = await hs
    .connect(Bob)
    .createShuffleForJoiner(hsId, bobShuffle.pk[0], bobShuffle.pk[1]);
  const joinerEvent = await joinerTx.wait().then((receipt: any) => {
    for (const event of receipt.events) {
      if (event.topics[0] == hs.filters.JoinGame(null, null, null).topics) {
        return event.args;
      }
    }
  });
  const shuffleId2 = Number(joinerEvent.shuffleId);
  console.log(
    `Alice Creates the game, and Bob joins the game, hsId is ${hsId}, shuffleId1 is ${shuffleId1}, shuffleId2 is ${shuffleId2}`
  );

  // // Alice and Bob join game, Alice should be the first player in shuffle1, Bob should be first player in shuffle2
  // const aliceIndex1 = (await aliceShuffle.joinGame(shuffleId1)).toNumber();
  // const bobIndex1 = (await bobShuffle.joinGame(shuffleId1)).toNumber();
  // console.log(
  //   `Alice and Bob join the first shuffle, alice id is ${aliceIndex1}, bob id is ${bobIndex1}`
  // );

  // const bobIndex2 = (await bobShuffle.joinGame(shuffleId2)).toNumber();
  // const aliceIndex2 = (await aliceShuffle.joinGame(shuffleId2)).toNumber();
  // console.log(
  //   `Alice and Bob join the second shuffle, alice id is ${aliceIndex2}, bob id is ${bobIndex2}`
  // );

  const aliceIndex1 = 0;
  const aliceIndex2 = 1;
  const bobIndex1 = 1;
  const bobIndex2 = 0;

  // Alice shuffle the fist deck
  await aliceShuffle.shuffle(shuffleId1, aliceIndex1);
  console.log(`Alice shuffled the first deck!`);

  // Bob shuffle the first deck
  await bobShuffle.shuffle(shuffleId1, bobIndex1);
  console.log(`Bob shuffled the first deck!`);

  // Bob shuffle the second deck
  await bobShuffle.shuffle(shuffleId2, bobIndex2);
  console.log(`Bob shuffled the second deck!`);

  // Alice shuffle the second deck
  await aliceShuffle.shuffle(shuffleId2, aliceIndex2);
  console.log(`Alice shuffled the second deck!`);

  // Bob deal card to Alice
  await bobShuffle.batchDraw(shuffleId1);
  console.log(`Bob draw the cards from first deck to Alice`);

  // Alice deal card to Bob
  await aliceShuffle.batchDraw(shuffleId2);
  console.log(`Alice draw the cards from second deck to Bob`);

  // start the game, the game will end in 5 rounds
  for (let i = 0; i < 10; i++) {
    await hs.connect(Alice).chooseCard(hsId, 0, i);
    console.log(`In the round ${i + 1}, Alice choose No.${i + 1} card`);

    let tx = await aliceShuffle.open(shuffleId1, i);
    const aliceCard = await aliceShuffle.queryCardValue(shuffleId1, i);
    console.log(
      `In the round ${i + 1}, Alice showed her card No.${
        i + 1
      }, the card value is ${aliceCard}, so this card is ${getRole(aliceCard)}`
    );

    let endGameFilter = hs.filters.EndGame(hsId, null);
    let events = await hs.queryFilter(endGameFilter, tx.blockHash);
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const winner = e.args.playerIdx.toNumber() == 0 ? "Alice" : "Bob";
      console.log(`Game End, winner is ${winner}`);
      return;
    }

    await hs.connect(Bob).chooseCard(hsId, 1, i);
    console.log(`In the round ${i + 1}, Bob choose No.${i + 1} card`);

    tx = await bobShuffle.open(shuffleId2, i);
    const bobCard = await aliceShuffle.queryCardValue(shuffleId2, i);
    console.log(
      `In the round ${i + 1}, Bob showed his card No.${
        i + 1
      }, the card value is ${bobCard}, so this card is ${getRole(bobCard)}`
    );

    const game = await hs.getGameInfo(hsId);
    console.log(
      `after this round, Alice's health is ${game.health[0]}, Bob's health is ${game.health[1]}`
    );

    endGameFilter = hs.filters.EndGame(hsId, null);
    events = await hs.queryFilter(endGameFilter, tx.blockHash);
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const winner = e.args.playerIdx.toNumber() == 0 ? "Alice" : "Bob";
      console.log(`Game End, winner is ${winner}`);
      return;
    }
  }
}

function getRole(cardValue: number) {
  const cardType = Math.floor(cardValue / 10);
  switch (cardType) {
    case 0:
      return "Wizard";
    case 1:
      return "Warrior";
    case 2:
      return "Tank";
    default:
      return "Invalid Role";
  }
}

describe("hs test", function () {
  it("Hilo", async () => {
    await fullprocess();
  });
});
