import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
// import useFaucet from "../hooks/useFaucet";
import { useWaitForTransaction } from 'wagmi';
import React, { useEffect } from 'react';
import { BigNumber } from 'ethers';
import useZKTBalance from '../hooks/useZKTBalance';
import { formatEther } from 'ethers/lib/utils.js';

const CARD_VALUES: Record<string, number> = {
  A: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  J: 11,
  Q: 12,
  K: 13,
};
export default function Home() {
  const [deck, setDeck] = useState<string[]>([]);
  const [currentCard, setCurrentCard] = useState<string>('');
  const [newCard, setNewCard] = useState<string>('');
  const [guess, setGuess] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);
  const [balance, setBalance] = React.useState<BigNumber | undefined>(
    undefined
  );
  // const {
  //   data: balanceData,
  //   isLoading: balanceLoading,
  //   isError: balanceError,
  //   refetch: balanceRefetch,
  // } = useZKTBalance();

  const startGame = () => {
    setGameOver(false);
    setGameWon(false);
    setGuess('');
    const newDeck = createDeck();
    setDeck(newDeck);
    // TODO:  get first card
    const firstCard = newDeck[Math.floor(Math.random() * 52)];
    setCurrentCard(firstCard);
  };
  const createDeck = () => {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = Object.keys(CARD_VALUES);
    const deck = suits.flatMap((suit) =>
      values.map((value) => `${value}${suit}`)
    );
    return deck;
  };
  const handleGuess = () => {
    const newCard = deck[Math.floor(Math.random() * deck.length)];
    const currentCardValue = CARD_VALUES[currentCard.slice(0, -1)];
    const newCardValue = CARD_VALUES[newCard.slice(0, -1)];
    setNewCard(newCard);
    const isHigher = newCardValue > currentCardValue;
    if ((isHigher && guess === 'higher') || (!isHigher && guess === 'lower')) {
      setGameWon(true);
    } else {
      setGameOver(true);
    }
  };

  const handleHigher = () => {
    setGuess('higher');
  };

  const handleLower = () => {
    setGuess('lower');
  };

  // const { data, write } = useFaucet();
  // const { isLoading, isSuccess } = useWaitForTransaction({
  //   hash: data?.hash,
  // });
  // const onFaucetButtonClicked = () => {
  //   write?.();
  // };

  // useEffect(() => {
  //   setBalance(balanceData as BigNumber);
  // }, [balanceData]);

  // useEffect(() => {
  //   if (isSuccess) {
  //     balanceRefetch();
  //   }
  // }, [isSuccess, balanceRefetch]);

  return (
    <>
      <div className=" flex flex-col min-h-screen bg-black ">
        <nav
          className="mt-8 ml-10 relative flex items-center justify-between sm:h-10 lg:justify-start"
          aria-label="Global"
        >
          <div className="flex-1 justify-start">
            <div className="flex  ">
              <div>
                <h4 className="mr-4 text-lg font-medium text-white ">
                  Chip Balance
                </h4>
                {/* {!balanceLoading && balance && (
                  <h3 className="mr-4 text-3xl font-mono font-bold text-[#4B87C8]">
                    {formatEther(balance)}
                  </h3>
                )} */}
              </div>
            </div>
          </div>
          <div className="items-center flex justify-end sm:flex md:flex md:flex-1 lg:w-0">
            <div className="mr-10">
              <ConnectButton />
            </div>
          </div>
        </nav>

        <div className="flex flex-col items-center justify-center h-screen text-white ">
          <img className="mb-10" src="/logo.png" />
          {!deck.length && (
            <>
              <button
                onClick={startGame}
                className="bg-black border-[#4B87C8] border border-2 text-[#DABEF1] py-2 px-4 rounded-lg"
              >
                Start Game
              </button>
              <button
                className={`mt-4 bg-[#4B87C8] hover:bg-[#DABEF1] text-white border border-2 border-[#4B87C8] py-1 px-4 rounded `}
                // onClick={onFaucetButtonClicked}
                // disabled={isLoading}
              >
                Buy Chips
              </button>
            </>
          )}
          {deck && deck.length > 0 && (
            <>
              <h1 className="text-4xl font-bold mb-4 font-mono">
                Hi-Lo Card Game
              </h1>
              <p className="text-2xl mb-4">Current card: {currentCard}</p>

              {!gameOver && !gameWon && (
                <>
                  <div className="flex items-center justify-center mb-4">
                    <button
                      onClick={handleLower}
                      className="text-lg font-bold mr-4"
                    >
                      Lower
                    </button>
                    <span className="text-lg font-bold text-[#4B87C8]">
                      {guess}
                    </span>
                    <button
                      onClick={handleHigher}
                      className="text-lg font-bold ml-4"
                    >
                      Higher
                    </button>
                  </div>
                  <button
                    onClick={handleGuess}
                    className={`bg-[#DABEF1] text-black py-2 px-4 rounded-lg ${
                      !guess && 'opacity-50 cursor-not-allowed'
                    }`}
                    disabled={!guess}
                  >
                    Guess
                  </button>
                </>
              )}
              {gameOver && (
                <p className="text-2xl text-red-500 mt-4">
                  Dealer's card is {currentCard}, you pulled {newCard} and
                  guessed{' '}
                  <i>
                    <b className="text-[#4B87C8]">{guess}</b>
                  </i>
                  . You Lost.
                </p>
              )}
              {gameWon && (
                <p className="text-2xl text-[#DABEF1] mt-4">
                  Dealer's card is {currentCard}, you pulled {newCard} and
                  guessed{' '}
                  <i>
                    <b className="text-[#4B87C8]">{guess}</b>
                  </i>
                  . You Won.
                </p>
              )}
              {(gameOver || gameWon) && (
                <>
                  <button
                    onClick={startGame}
                    className="bg-black border-[#4B87C8] border border-2 text-[#DABEF1] py-2 px-4 rounded-lg mt-4"
                  >
                    {' '}
                    Play Again{' '}
                  </button>
                  <button
                    className={`mt-4 bg-[#4B87C8] hover:bg-[#DABEF1] text-white border border-2 border-[#4B87C8] py-1 px-4 rounded `}
                    // onClick={onFaucetButtonClicked}
                    // disabled={isLoading}
                  >
                    Buy Chips
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
