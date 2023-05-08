// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../shuffle/IShuffle.sol";

enum Selection {
    High,
    Low
}

// Data for a specific game
struct Game {
    // Player address
    address[2] players;
    uint256[2] cardValues;
    bool[2] guessed;
    Selection[2] guess;
}

// Game logic for zkHiLo
contract HiLo is Ownable {
    uint256 public constant INVALID_CARD_INDEX = 999999;

    // Shuffle state machine
    IShuffle public shuffleStateMachine;

    // Largest game id that has been created
    uint256 public largestGameId;

    // Mapping from id to game
    mapping(uint256 => Game) games;
    // Events
    event GameCreated(uint256 gameId, address playerAddress);
    event GameJoined(uint256 gameId, address playerAddress);
    event ShuffleDeck(uint256 gameId, address player);
    event DealCard(uint256 gameId, uint256 cardIdx, address player);
    event Guess(uint256 gameId, Selection selection, address player);
    event ShowCard(
        uint256 gameId,
        uint256 cardIdx,
        uint256 cardValue,
        address player
    );

    constructor(address shuffle_) {
        require(shuffle_ != address(0), "empty address");
        shuffleStateMachine = IShuffle(shuffle_);
        largestGameId = 10000;
    }

    // Creates a game.
    function createGame(uint256[2] memory pk) external {
        ++largestGameId;

        uint256 gameId = largestGameId;
        games[gameId].players[0] = msg.sender;

        shuffleStateMachine.setGameSettings(2, gameId);
        shuffleStateMachine.register(msg.sender, pk, gameId);

        emit GameCreated(gameId, msg.sender);
    }

    // Joins a game with `gameId`.
    function joinGame(uint256 gameId, uint256[2] memory pk) external {
        games[gameId].players[1] = msg.sender;
        shuffleStateMachine.register(msg.sender, pk, gameId);

        emit GameJoined(gameId, msg.sender);
    }

    // Shuffles the deck.
    function shuffle(
        uint256[8] memory proof,
        uint256[107] calldata shuffleData,
        uint256 gameId
    ) external {
        uint256 nonce;
        uint256[52] memory shuffledX0;
        uint256[52] memory shuffledX1;
        uint[2] memory selector;

        nonce = shuffleData[0];
        for (uint256 i = 0; i < 52; i++) {
            shuffledX0[i] = shuffleData[i + 1];
        }
        for (uint256 i = 0; i < 52; i++) {
            shuffledX1[i] = shuffleData[i + 53];
        }
        for (uint256 i = 0; i < 2; i++) {
            selector[i] = shuffleData[i + 105];
        }

        shuffleStateMachine.shuffle(
            msg.sender,
            proof,
            nonce,
            shuffledX0,
            shuffledX1,
            selector,
            gameId
        );

        emit ShuffleDeck(gameId, msg.sender);
    }

    function getPlayerIndex(
        uint256 gameId,
        address player
    ) public view returns (uint256) {
        require(player != address(0), "empty address");
        if (games[gameId].players[0] == player) {
            return 0;
        }
        if (games[gameId].players[1] == player) {
            return 1;
        }
        return INVALID_CARD_INDEX;
    }

    // Deals `cardIdx`-th card to opponent player.
    function dealHandCard(
        uint256 gameId,
        uint256 cardIdx,
        uint256[8] memory proof,
        uint256[2] memory decryptedCard,
        uint256[2] memory initDelta
    ) external {
        uint256 playerIdx = getPlayerIndex(gameId, msg.sender);
        require(playerIdx != INVALID_CARD_INDEX, "invalid player");

        shuffleStateMachine.deal(
            msg.sender,
            cardIdx,
            playerIdx,
            proof,
            decryptedCard,
            initDelta,
            gameId
        );

        emit DealCard(gameId, cardIdx, msg.sender);
    }

    function guess(uint256 gameId, Selection selection) external {
        uint256 playerIdx = getPlayerIndex(gameId, msg.sender);
        require(playerIdx != INVALID_CARD_INDEX, "invalid player");
        require(!games[gameId].guessed[playerIdx], "player already guessed");

        games[gameId].guess[playerIdx] = selection;
        games[gameId].guessed[playerIdx] = true;

        emit Guess(gameId, selection, msg.sender);
    }

    // player shows `cardIdx`-th card.
    function showHand(
        uint256 gameId,
        uint256 cardIdx,
        uint256[8] memory proof,
        uint256[2] memory decryptedCard
    ) external {
        uint256 playerIdx = getPlayerIndex(gameId, msg.sender);
        require(playerIdx != INVALID_CARD_INDEX, "invalid player");

        require(
            games[gameId].guessed[0] && games[gameId].guessed[1],
            "not guess yet"
        );

        shuffleStateMachine.deal(
            msg.sender,
            cardIdx,
            playerIdx,
            proof,
            decryptedCard,
            [uint256(0), uint256(0)], // No need for initDelta since this card has been dealt before
            gameId
        );

        uint256 cardValue = shuffleStateMachine.search(cardIdx, gameId);
        require(
            cardValue != shuffleStateMachine.INVALID_CARD_INDEX(),
            "Invalid card value"
        );
        games[gameId].cardValues[playerIdx] = cardValue + 1;

        emit ShowCard(gameId, cardIdx, cardValue, msg.sender);
    }

    function queryAggregatedPk(
        uint256 gameId
    ) external view returns (uint256[2] memory) {
        return shuffleStateMachine.queryAggregatedPk(gameId);
    }

    function queryDeck(uint256 gameId) external view returns (Deck memory) {
        return shuffleStateMachine.queryDeck(gameId);
    }

    function queryCardFromDeck(
        uint256 gameId,
        uint256 cardIdx
    ) external view returns (uint256[4] memory) {
        return shuffleStateMachine.queryCardFromDeck(cardIdx, gameId);
    }

    function queryCardInDeal(
        uint256 gameId,
        uint256 cardIdx
    ) external view returns (uint256[4] memory) {
        return shuffleStateMachine.queryCardInDeal(cardIdx, gameId);
    }

    function getCardValue(
        uint256 gameId,
        uint256 cardIdx
    ) public view returns (uint256) {
        return shuffleStateMachine.search(cardIdx, gameId);
    }

    function getGameInfo(uint256 gameId) public view returns (Game memory) {
        return games[gameId];
    }

    function isGuessRight(
        uint256 gameId,
        address player
    ) public view returns (bool) {
        uint256 playerIdx = getPlayerIndex(gameId, player);
        require(playerIdx != INVALID_CARD_INDEX, "invalid player");

        require(
            games[gameId].cardValues[0] != 0 && games[gameId].cardValues[1] != 0
        );

        if (games[gameId].guess[playerIdx] == Selection.High) {
            return
                games[gameId].cardValues[playerIdx] >
                games[gameId].cardValues[1 - playerIdx];
        } else {
            return
                games[gameId].cardValues[playerIdx] <
                games[gameId].cardValues[1 - playerIdx];
        }
    }
}
