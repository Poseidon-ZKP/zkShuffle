// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../shuffle/IShuffle.sol";
import "hardhat/console.sol";

// Game stage
enum GameStage {
    // Registering players
    Register,
    // Taking turns to shuffle
    Shuffle,
    // Dealing player's hand card which is invisible to the other player
    DealHandCard,
    // Guessing whether a player's hand card is larger than the other player's
    Guess,
    // Showing the hand card to all players
    ShowHand,
    // Game ended
    Ended
}

// Guess whether hand card is higher than the other's
enum Guess {
    // Higher than the other player's
    High,
    // Lower than the other player's
    Low
}

// Data for a specific game
struct Game {
    // Game stage
    GameStage stage;
    // Player address
    address[2] playerAddress;
    // Index of the player to take action
    uint8 playerIdx;
    // Player guess
    Guess[2] guess;
    // Whether each player has guessed correctly
    bool[2] guessCorrect;
}

// Game logic for zkHiLo
contract HiLo is Ownable {
    // Shuffle state machine
    IShuffle public shuffleStateMachine;

    // Largest game id that has been created
    uint256 public largestGameId;

    // Mapping from id to game
    mapping(uint256 => Game) public games;
    // Events
    event GameCreated(uint256 gameId, GameStage stage, address playerAddress);
    event GameJoined(uint256 gameId, GameStage stage, address playerAddress);
    event DealHandCard(uint256 gameId, GameStage stage);

    constructor(address shuffle_) {
        require(shuffle_ != address(0), "empty address");
        shuffleStateMachine = IShuffle(shuffle_);
        largestGameId = 0;
    }

    // Checks if `msg.sender` should take action.
    modifier checkTurn(uint256 gameId) {
        require(
            msg.sender == games[gameId].playerAddress[games[gameId].playerIdx],
            "Not your turn"
        );
        _;
    }

    // Creates a game.
    function createGame(uint256[2] memory pk) external returns (uint256) {
        uint256 gameId = ++largestGameId;
        games[gameId].stage = GameStage.Register;
        games[gameId].playerAddress[0] = msg.sender;
        console.log("pk : ", pk[0]);
        // console.log("stage ", games[gameId].stage);
        shuffleStateMachine.setGameSettings(2, gameId);
        shuffleStateMachine.register(msg.sender, pk, gameId);
        emit GameCreated(
            gameId,
            games[gameId].stage,
            games[gameId].playerAddress[0]
        );
        return gameId;
    }

    // Joins a game with `gameId`.
    function joinGame(uint256 gameId, uint256[2] memory pk) external {
        require(
            games[gameId].stage == GameStage.Register,
            "Not in register stage"
        );
        games[gameId].playerAddress[1] = msg.sender;
        games[gameId].stage = GameStage.Shuffle;
        games[gameId].playerIdx = 0;
        shuffleStateMachine.register(msg.sender, pk, gameId);
        emit GameJoined(
            gameId,
            games[gameId].stage,
            games[gameId].playerAddress[1]
        );
    }

    // Shuffles the deck.
    function shuffle(
        uint256[8] memory proof,
        uint256 nonce,
        uint256[52] calldata shuffledX0,
        uint256[52] calldata shuffledX1,
        uint256[2] calldata selector,
        uint256 gameId
    ) external checkTurn(gameId) {
        require(
            games[gameId].stage == GameStage.Shuffle,
            "Not in shuffle stage"
        );
        shuffleStateMachine.shuffle(
            msg.sender,
            proof,
            nonce,
            shuffledX0,
            shuffledX1,
            selector,
            gameId
        );
        nextPlayer(gameId);
    }

    // Deals a hand card.
    function dealHandCard(
        uint256 gameId,
        uint256[8] memory proof,
        uint256[2] memory decryptedCard,
        uint256[2] memory initDelta
    ) external checkTurn(gameId) {
        require(
            games[gameId].stage == GameStage.DealHandCard,
            "Not in deal hand card stage"
        );
        uint256 playerIdx = games[gameId].playerIdx;
        shuffleStateMachine.deal(
            msg.sender,
            playerIdx == 0 ? 1 : 0,
            playerIdx,
            proof,
            decryptedCard,
            initDelta,
            gameId
        );
        nextPlayer(gameId);
        emit DealHandCard(gameId, games[gameId].stage);
    }

    // Guesses a high or low value.
    function guess(Guess selection, uint256 gameId) external checkTurn(gameId) {
        require(games[gameId].stage == GameStage.Guess, "Not in guess stage");
        games[gameId].guess[games[gameId].playerIdx] = selection;
        nextPlayer(gameId);
    }

    // Shows hand card values.
    function showHand(
        uint256 gameId,
        uint256[8] memory proof,
        uint256[2] memory decryptedCard
    ) external checkTurn(gameId) {
        require(
            games[gameId].stage == GameStage.ShowHand,
            "Not in show hand stage"
        );
        uint256 playerIdx = games[gameId].playerIdx;
        shuffleStateMachine.deal(
            msg.sender,
            playerIdx == 0 ? 0 : 1,
            playerIdx,
            proof,
            decryptedCard,
            [uint256(0), uint256(0)], // No need for initDelta since this card has been dealt before
            gameId
        );
        nextPlayer(gameId);
        if (games[gameId].stage == GameStage.Ended) {
            evaluate(gameId);
        }
    }

    // Evaluates whether individual players have guessed correctly.
    function evaluate(uint256 gameId) internal {
        uint256[2] memory cardValues;
        for (uint8 i = 0; i < 2; i++) {
            cardValues[i] = shuffleStateMachine.search(i, gameId);
            require(
                cardValues[i] != shuffleStateMachine.INVALID_CARD_INDEX(),
                "Invalid card value"
            );
        }
        Guess guess1;
        Guess guess2;
        if (cardValues[0] < cardValues[1]) {
            guess1 = Guess.Low;
        } else {
            guess1 = Guess.High;
        }
        if (cardValues[1] < cardValues[0]) {
            guess2 = Guess.Low;
        } else {
            guess2 = Guess.High;
        }

        games[gameId].guessCorrect = [
            guess1 == games[gameId].guess[0],
            guess2 == games[gameId].guess[1]
        ];
    }

    // Moves to the next player and updates stage if all players have taken actions.
    function nextPlayer(uint256 gameId) internal {
        games[gameId].playerIdx += 1;
        if (games[gameId].playerIdx == 2) {
            games[gameId].playerIdx = 0;
            uint256 nextStage = uint256(games[gameId].stage) + 1;
            require(
                nextStage <= uint256(GameStage.Ended),
                "game already ended"
            );
            games[gameId].stage = GameStage(nextStage);
        }
    }
}
