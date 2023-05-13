import { ethers } from "hardhat";
import { ShuffleContext } from "../sdk/context";

async function main() {
  const [Alice, Bob] = await ethers.getSigners();

  const shuffleAddress = process.env.SHUFFLE!;
  const hiloAddress = process.env.HILO!;

  const shuffle = await ethers.getContractAt("ShuffleManager", shuffleAddress);
  const hilo = await ethers.getContractAt("HiloGame", hiloAddress);

  // Alice create game
  const createGameTx = await hilo.connect(Alice).createGame();

  const createGameEvent = await createGameTx.wait().then((receipt: any) => {
    return receipt.events[0].args;
  });
  const hiloId = Number(createGameEvent.hiloId);
  const shuffleId = Number(createGameEvent.shuffleId);
  console.log(
    `Alice Creates the game, hiloId is ${hiloId}, shuffleId is ${shuffleId}`
  );

  // init shuffle context, which packages the ShuffleManager contract

  // Alice init shuffle
  const aliceShuffle = new ShuffleContext(shuffle, Alice);
  await aliceShuffle.init();

  // Bob init shuffle
  const bobShuffle = new ShuffleContext(shuffle, Bob);
  await bobShuffle.init();

  // Alice joins game
  const aliceIndex = (await aliceShuffle.joinGame(shuffleId)).toNumber();
  console.log(`Alice joins the game, and her player id is ${aliceIndex}`);

  // Bob joins game
  const bobIndex = (await bobShuffle.joinGame(shuffleId)).toNumber();
  console.log(`Bob joins the game, and his player id is ${bobIndex}`);

  // Alice shuffle the deck
  await aliceShuffle.shuffle(shuffleId, aliceIndex);
  console.log(`Alice shuffled the deck!`);

  // Bob shuffle the deck
  await bobShuffle.shuffle(shuffleId, bobIndex);
  console.log(`Bob shuffled the deck!`);

  // Bob deal card to Alice
  await bobShuffle.draw(shuffleId);
  console.log(`Bob draw the first card to Alice`);

  // Alice deal card to Bob
  await aliceShuffle.draw(shuffleId);
  console.log(`Alice draw the second card to Bob`);

  // Alice guess if her card is higher than Bob's, 1 means higher, 2 means lower
  await (await hilo.connect(Alice).guess(hiloId, 1)).wait();
  console.log(
    "Alice takes a guess, she thinks her card is higher than Bob's card"
  );

  // Bob guess if her card is higher than Bob's, 1 means higher, 2 means lower
  await (await hilo.connect(Bob).guess(hiloId, 1)).wait();
  console.log(
    "Bob takes a guess, he thinks his card is higher than Alice's card"
  );

  // Alice shows her hand card
  let card = await aliceShuffle.open(shuffleId, 0);
  console.log(`Alice opens her card, and her card is ${card}`);

  // Bob shows his hand card
  card = await bobShuffle.open(shuffleId, 1);
  console.log(`Bob opens his card, and his card is ${card}`);

  // checkout if Alice's guess is right
  let result = await hilo.isGuessRight(hiloId, aliceIndex);
  console.log(`Alice's guess result is ${result}`);

  // checkout if Bob's guess is right
  result = await hilo.isGuessRight(hiloId, bobIndex);
  console.log(`Bob's guess result is ${result}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
