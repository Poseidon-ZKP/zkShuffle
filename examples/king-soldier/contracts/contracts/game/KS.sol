// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
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

contract KS is Initializable {
    uint256 public largestgameId;

    IShuffle public shuffle1;
    IShuffle public shuffle2;

    // Mapping from id to game
    mapping(uint256 => Game) public games;

    uint256 public constant INVALID_CARD_INDEX = 999999;

    // Events
    event GameCreated(uint256 gameId, address player, CharactorType ct);
    event GameJoined(uint256 gameId, address player, CharactorType ct);
    event ShuffleDeck(uint256 gameId, address player);
    event DealCard(uint256 gameId, uint256 cardIdx, address player);
    event ChooseCard(
        uint256 gameId,
        uint256 cardIdx,
        address player,
        uint256 round
    );
    event GameEnded(uint256 gameId, address winner);

    function initialize(
        address shuffle1_,
        address shuffle2_
    ) public initializer {
        require(shuffle1_ != address(0), "shuffle1 empty address");
        require(shuffle2_ != address(0), "shuffle2 empty address");

        shuffle1 = IShuffle(shuffle1_);
        shuffle2 = IShuffle(shuffle2_);

        largestgameId = 1000;
    }

    // Creates a game.
    function createGame(uint256[2] memory pk, CharactorType ct) external {
        ++largestgameId;
        uint256 gameId = largestgameId;

        shuffle1.setGameSettings(2, gameId);
        shuffle2.setGameSettings(2, gameId);
        shuffle1.register(msg.sender, pk, gameId);
        shuffle2.register(msg.sender, pk, gameId);

        games[gameId].players[0] = msg.sender;
        games[gameId].cts[0] = ct;

        emit GameCreated(gameId, msg.sender, ct);
    }

    // Joins a game with `gameId`.
    function joinGame(uint256 gameId, uint256[2] memory pk) external {
        require(games[gameId].players[0] != address(0), "game not created");
        require(msg.sender != games[gameId].players[0], "same player");

        games[gameId].players[1] = msg.sender;
        games[gameId].cts[1] = CharactorType(1 - uint256(games[gameId].cts[0]));

        shuffle1.register(msg.sender, pk, gameId);
        shuffle2.register(msg.sender, pk, gameId);

        emit GameJoined(gameId, msg.sender, games[gameId].cts[1]);
    }

    // Shuffles the deck.
    function shuffle(
        uint256[8] calldata proof1,
        uint256[8] calldata proof2,
        uint256[13] calldata shuffle1Data,
        uint256[13] calldata shuffle2Data,
        uint256 gameId
    ) external {
        shuffleOneDeck(proof1, shuffle1Data, shuffle1, gameId);
        shuffleOneDeck(proof2, shuffle2Data, shuffle2, gameId);

        emit ShuffleDeck(gameId, msg.sender);
    }

    function shuffleOneDeck(
        uint256[8] calldata proof,
        uint256[13] calldata shuffleData,
        IShuffle s,
        uint256 gameId
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
            gameId
        );
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

    // Deal cardIdx-th card to opponent
    function dealHandCard(
        uint256 gameId,
        uint256 cardIdx,
        uint256[8] memory proof,
        uint256[2] memory decryptedCard,
        uint256[2] memory initDelta
    ) external {
        uint256 playerIdx = getPlayerIndex(gameId, msg.sender);
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
            gameId
        );

        emit DealCard(gameId, cardIdx, msg.sender);
    }

    function chooseCard(
        uint256 gameId,
        uint256 cardIdx,
        uint256 round
    ) external {
        require(round == games[gameId].currentRound, "not in current round");

        uint256 playerIdx = getPlayerIndex(gameId, msg.sender);
        require(playerIdx != INVALID_CARD_INDEX, "invalid player");

        games[gameId].roundCardChoice[round][playerIdx] = cardIdx;

        emit ChooseCard(gameId, cardIdx, msg.sender, round);
    }

    // Shows hand card values.
    function showHand(
        uint256 gameId,
        uint256 round,
        uint256[8] memory proof,
        uint256[2] memory decryptedCard
    ) external {
        require(
            games[gameId].winner == address(0),
            "this round already has a winner"
        );
        require(round == games[gameId].currentRound, "not in current round");

        uint256 playerIdx = getPlayerIndex(gameId, msg.sender);
        require(playerIdx != INVALID_CARD_INDEX, "invalid player");

        uint256 cardIdx = games[gameId].roundCardChoice[round][playerIdx];

        // player1 deal shuffle1 and player2 deal shuffle2
        IShuffle s = playerIdx == 0 ? shuffle1 : shuffle2;
        s.deal(
            msg.sender,
            cardIdx,
            playerIdx,
            proof,
            decryptedCard,
            [uint256(0), uint256(0)], // No need for initDelta since this card has been dealt before
            gameId
        );

        uint256 cardValue = s.search(cardIdx, gameId);
        require(cardValue != s.INVALID_CARD_INDEX(), "Invalid card value");

        // prevent 0
        games[gameId].roundCardValue[round][playerIdx] = cardValue + 1;

        // both players showed card, start to battle
        if (games[gameId].roundCardValue[round][1 - playerIdx] != 0) {
            if (games[gameId].cts[0] == CharactorType.King) {
                battle(
                    gameId,
                    0,
                    games[gameId].roundCardValue[round][0],
                    games[gameId].roundCardValue[round][1]
                );
            } else {
                battle(
                    gameId,
                    1,
                    games[gameId].roundCardValue[round][1],
                    games[gameId].roundCardValue[round][0]
                );
            }
        }
    }

    // King > Citizen, Citizen > Soldier, Soldier > King
    function battle(
        uint256 gameId,
        uint256 kingPlayerIdx,
        uint256 kingValue,
        uint256 soldierValue
    ) internal {
        if (kingValue > 1 && soldierValue > 1) {
            games[gameId].currentRound += 1;
            return;
        }
        if (kingValue == 1 && soldierValue == 1) {
            // soldier wins
            games[gameId].winner = games[gameId].players[1 - kingPlayerIdx];
        } else {
            games[gameId].winner = games[gameId].players[kingPlayerIdx];
        }
        emit GameEnded(gameId, games[gameId].winner);
    }

    function queryAggregatedPk(
        uint256 gameId,
        uint256 deckIdx
    ) external view returns (uint256[2] memory) {
        IShuffle s = deckIdx == 0 ? shuffle1 : shuffle2;
        return s.queryAggregatedPk(gameId);
    }

    function queryDeck(
        uint256 gameId,
        uint256 deckIdx
    ) external view returns (Deck memory) {
        IShuffle s = deckIdx == 0 ? shuffle1 : shuffle2;
        return s.queryDeck(gameId);
    }

    function queryCardFromDeck(
        uint256 gameId,
        uint256 cardIdx,
        uint256 deckIdx
    ) external view returns (uint256[4] memory) {
        IShuffle s = deckIdx == 0 ? shuffle1 : shuffle2;
        return s.queryCardFromDeck(cardIdx, gameId);
    }

    function queryCardInDeal(
        uint256 gameId,
        uint256 cardIdx,
        uint256 deckIdx
    ) external view returns (uint256[4] memory) {
        IShuffle s = deckIdx == 0 ? shuffle1 : shuffle2;
        return s.queryCardInDeal(cardIdx, gameId);
    }

    function getCardValue(
        uint256 gameId,
        uint256 cardIdx,
        uint256 deckIdx
    ) public view returns (uint256) {
        IShuffle s = deckIdx == 0 ? shuffle1 : shuffle2;
        return s.search(cardIdx, gameId);
    }

    function getGameInfo(uint256 gameId) public view returns (Game memory) {
        return games[gameId];
    }
}
