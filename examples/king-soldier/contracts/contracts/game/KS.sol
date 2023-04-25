// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../shuffle/IShuffle.sol";

enum CharactorType {
    King, // 1: King, 2-5: Citizen
    Soldier // 1: Soldier, 2-5: Citizen
}

struct Game {
    CharactorType[2] cts;
    address[2] players;
    // For every round, both players need to choose which card to show
    uint256[2][5] roundCardChoice;
    uint256[2][5] roundCardValue;
    uint256 currentRound;
    address winner;
}

contract KS {
    uint256 public largestGameID;

    IShuffle public shuffle1;
    IShuffle public shuffle2;

    // Mapping from id to game
    mapping(uint256 => Game) public games;

    uint256 public constant INVALID_CARD_INDEX = 999999;

    // Events
    event GameCreated(uint256 gameID, address playerAddress);
    event GameJoined(uint256 gameID, address playerAddress);
    event GameEnded(uint256 gameID, address winner);

    constructor(address shuffle1_, address shuffle2_) {
        require(shuffle1_ != address(0), "shuffle1 empty address");
        require(shuffle2_ != address(0), "shuffle2 empty address");

        shuffle1 = IShuffle(shuffle1_);
        shuffle2 = IShuffle(shuffle2_);

        largestGameID = 1;
    }

    // Creates a game.
    function createGame(uint256[2] memory pk, CharactorType ct) external {
        uint256 gameID = largestGameID;

        shuffle1.setGameSettings(2, gameID);
        shuffle2.setGameSettings(2, gameID);
        shuffle1.register(msg.sender, pk, gameID);
        shuffle2.register(msg.sender, pk, gameID);

        games[gameID].players[0] = msg.sender;
        games[gameID].cts[0] = ct;

        largestGameID++;

        emit GameCreated(gameID, msg.sender);
    }

    // Joins a game with `gameID`.
    function joinGame(
        uint256 gameID,
        uint256[2] memory pk,
        CharactorType ct
    ) external {
        require(games[gameID].players[0] != address(0), "game not created");
        require(msg.sender != games[gameID].players[0], "same player");
        require(games[gameID].cts[0] != ct, "same charactor");

        games[gameID].players[1] = msg.sender;
        games[gameID].cts[1] = ct;

        shuffle1.register(msg.sender, pk, gameID);
        shuffle2.register(msg.sender, pk, gameID);

        emit GameJoined(gameID, msg.sender);
    }

    // Shuffles the deck.
    function shuffle(
        uint256[8] calldata proof1,
        uint256[8] calldata proof2,
        uint256[13] calldata shuffle1Data,
        uint256[13] calldata shuffle2Data,
        uint256 gameID
    ) external {
        shuffleOneDeck(proof1, shuffle1Data, shuffle1, gameID);
        shuffleOneDeck(proof2, shuffle2Data, shuffle2, gameID);
    }

    function shuffleOneDeck(
        uint256[8] calldata proof,
        uint256[13] calldata shuffleData,
        IShuffle s,
        uint256 gameID
    ) internal {
        uint256 nonce;
        uint256[5] memory shuffledX0;
        uint256[5] memory shuffledX1;
        uint[2] memory selector;

        nonce = shuffleData[0];
        for (uint256 i = 0; i < 5; i++) {
            shuffledX0[i] = shuffleData[i + 1];
        }
        for (uint256 i = 0; i < 5; i++) {
            shuffledX1[i] = shuffleData[i + 6];
        }
        for (uint256 i = 0; i < 2; i++) {
            selector[i] = shuffleData[i + 11];
        }

        s.shuffle(
            msg.sender,
            proof,
            nonce,
            shuffledX0,
            shuffledX1,
            selector,
            gameID
        );
    }

    function getPlayerIndex(
        uint256 gameID,
        address player
    ) public view returns (uint256) {
        require(player != address(0), "empty address");
        if (games[gameID].players[0] == player) {
            return 0;
        }
        if (games[gameID].players[1] == player) {
            return 1;
        }
        return INVALID_CARD_INDEX;
    }

    // Deal cardIdx-th card to opponent
    function dealHandCard(
        uint256 gameID,
        uint256 cardIdx,
        uint256[8] memory proof,
        uint256[2] memory decryptedCard,
        uint256[2] memory initDelta
    ) external {
        uint256 playerIdx = getPlayerIndex(gameID, msg.sender);
        require(playerIdx != INVALID_CARD_INDEX, "invalid player");

        // player1 deal shuffle2 and player2 deal shuffle1
        IShuffle s = playerIdx == 0 ? shuffle2 : shuffle1;

        s.deal(
            msg.sender,
            cardIdx,
            playerIdx,
            proof,
            decryptedCard,
            initDelta,
            gameID
        );
    }

    function chooseCard(
        uint256 gameID,
        uint256 cardIdx,
        uint256 round
    ) external {
        require(round == games[gameID].currentRound, "not in current round");

        uint256 playerIdx = getPlayerIndex(gameID, msg.sender);
        require(playerIdx != INVALID_CARD_INDEX, "invalid player");

        games[gameID].roundCardChoice[round][playerIdx] = cardIdx;
    }

    // Shows hand card values.
    function showHand(
        uint256 gameID,
        uint256 round,
        uint256[8] memory proof,
        uint256[2] memory decryptedCard
    ) external {
        require(
            games[gameID].winner == address(0),
            "this round already has a winner"
        );
        require(round == games[gameID].currentRound, "not in current round");

        uint256 playerIdx = getPlayerIndex(gameID, msg.sender);
        require(playerIdx != INVALID_CARD_INDEX, "invalid player");

        uint256 cardIdx = games[gameID].roundCardChoice[round][playerIdx];

        // player1 deal shuffle1 and player2 deal shuffle2
        IShuffle s = playerIdx == 0 ? shuffle1 : shuffle2;
        s.deal(
            msg.sender,
            cardIdx,
            playerIdx,
            proof,
            decryptedCard,
            [uint256(0), uint256(0)], // No need for initDelta since this card has been dealt before
            gameID
        );

        uint256 cardValue = s.search(cardIdx, gameID);
        require(cardValue != s.INVALID_CARD_INDEX(), "Invalid card value");

        // prevent 0
        games[gameID].roundCardValue[round][playerIdx] = cardValue + 1;

        // both players showed card, start to battle
        if (games[gameID].roundCardValue[round][1 - playerIdx] != 0) {
            if (games[gameID].cts[0] == CharactorType.King) {
                battle(
                    gameID,
                    0,
                    games[gameID].roundCardValue[round][0],
                    games[gameID].roundCardValue[round][1]
                );
            } else {
                battle(
                    gameID,
                    1,
                    games[gameID].roundCardValue[round][1],
                    games[gameID].roundCardValue[round][0]
                );
            }
        }
    }

    // King > Citizen, Citizen > Soldier, Soldier > King
    function battle(
        uint256 gameID,
        uint256 kingPlayerIdx,
        uint256 kingValue,
        uint256 soldierValue
    ) internal {
        if (kingValue > 1 && soldierValue > 1) {
            games[gameID].currentRound += 1;
            return;
        }
        if (kingValue == 1 && soldierValue == 1) {
            // soldier wins
            games[gameID].winner = games[gameID].players[1 - kingPlayerIdx];
        } else {
            games[gameID].winner = games[gameID].players[kingPlayerIdx];
        }
        emit GameEnded(gameID, games[gameID].winner);
    }

    function queryCardFromDeck(
        uint256 gameID,
        uint256 cardIdx,
        uint256 deckIdx
    ) external view returns (uint256[4] memory) {
        IShuffle s = deckIdx == 0 ? shuffle1 : shuffle2;
        return s.queryCardFromDeck(cardIdx, gameID);
    }

    function queryCardInDeal(
        uint256 gameID,
        uint256 cardIdx,
        uint256 deckIdx
    ) external view returns (uint256[4] memory) {
        IShuffle s = deckIdx == 0 ? shuffle1 : shuffle2;
        return s.queryCardInDeal(cardIdx, gameID);
    }

    function getCardValue(
        uint256 gameID,
        uint256 cardIdx,
        uint256 deckIdx
    ) public view returns (uint256) {
        IShuffle s = deckIdx == 0 ? shuffle1 : shuffle2;
        return s.search(cardIdx, gameID);
    }

    function getWinner(uint256 gameID) public view returns (address) {
        return games[gameID].winner;
    }
}
