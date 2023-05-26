// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "../../shuffle/IBaseGame.sol";
import "../../shuffle/IShuffleStateManager.sol";
import "hardhat/console.sol";

// An example game contract using zkShuffle
// Hilo is a simple two-player game on 5 card deck
// 1. deal the first card to player 0
// 2. deal the second card to player 1
// 3. (Offchain) player guess who's card is bigger
// 4. Open player 0's card
// 5. Open player 1's card
// So the game dev only need to specify the game state machine:
// - create a new game by calling ShuffleManager store the `gameID`
//   from ShuffleManager
// - define the game state machine by specifying the next state in the `next`
//   calldata so that ShuffleManager will call back
contract Hilo is IBaseGame {
    IShuffleStateManager public ishuffle;

    // check whether the caller is the shuffle Manager
    modifier onlyShuffleManager() {
        require(
            address(ishuffle) == msg.sender,
            "Caller is not shuffle manager."
        );
        _;
    }

    // check whether the caller is the game owner
    modifier onlyGameOwner(uint gameId) {
        require(gameOwners[gameId] == msg.sender, "Caller is not game owner.");
        _;
    }

    function cardConfig() external pure override returns (uint8) {
        return 5;
    }

    uint256 public largestGameId;

    // a mapping between Hilo's gameId
    // to the "global" gameId returned by ShuffleManager
    mapping(uint => uint) shuffleGameId;

    // a mapping between Hilo's gameId and game owners
    mapping(uint => address) gameOwners;

    constructor(IShuffleStateManager _ishuffle) {
        ishuffle = _ishuffle;
    }

    // create a new game by a player
    function newGame() external returns (uint) {
        uint256 gameId = ishuffle.createShuffleGame(2);
        shuffleGameId[++largestGameId] = gameId;
        gameOwners[largestGameId] = msg.sender;
        return gameId;
    }

    // move the game into "Player Registering" State,
    // a.k.a. allow players to join the game
    function allowJoinGame(uint gameId) external onlyGameOwner(gameId) {
        bytes memory next = abi.encodeWithSelector(
            this.moveToShuffleStage.selector,
            gameId
        );
        ishuffle.register(shuffleGameId[gameId], next);
    }

    // Allow players to shuffle the deck, and specify the next state:
    // dealCard0ToPlayer0
    function moveToShuffleStage(uint gameId) external onlyShuffleManager {
        bytes memory next = abi.encodeWithSelector(
            this.dealCard0ToPlayer0.selector,
            gameId
        );
        ishuffle.shuffle(shuffleGameId[gameId], next);
    }

    // Deal the 0th card to player 0 and specify the next state:
    // dealCard1ToPlayer1
    function dealCard0ToPlayer0(uint gameId) external onlyShuffleManager {
        BitMaps.BitMap256 memory cards;
        cards._data = 1; // ...0001
        bytes memory next = abi.encodeWithSelector(
            this.dealCard1ToPlayer1.selector,
            gameId
        );
        ishuffle.dealCardsTo(shuffleGameId[gameId], cards, 0, next);
    }

    // Deal the 1st card to player 1 and specify the next state:
    // openCard0
    function dealCard1ToPlayer1(uint gameId) external onlyShuffleManager {
        BitMaps.BitMap256 memory cards;
        cards._data = 2; // ...0010
        bytes memory next = abi.encodeWithSelector(
            this.openCard0.selector,
            gameId
        );
        ishuffle.dealCardsTo(shuffleGameId[gameId], cards, 1, next);
    }

    // Open Card 0 and specify the next state:
    // openCard1
    function openCard0(uint gameId) external onlyShuffleManager {
        bytes memory next = abi.encodeWithSelector(
            this.openCard1.selector,
            gameId
        );
        ishuffle.openCards(shuffleGameId[gameId], 0, 1, next);
    }

    // Open the Card 1 and specify the next state:
    // openCard1
    function openCard1(uint gameId) external onlyShuffleManager {
        bytes memory next = abi.encodeWithSelector(
            this.endGame.selector,
            gameId
        );
        ishuffle.openCards(shuffleGameId[gameId], 1, 1, next);
    }

    // End the game, GG!
    function endGame(uint gameId) external onlyShuffleManager {
        // game-specific cleanup
        ishuffle.endGame(gameId);
    }
}
