// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "../../shuffle/IBaseGame.sol";
import "../../shuffle/IBaseStateManager.sol";
import "hardhat/console.sol";

// State-less Pure game logic contract
// 1. state-less game contract don't care about shuffle-state,
//    so they only impl the game logic interface define in IBaseGame
contract Hilo is IBaseGame {
    IBaseStateManager public ishuffle;

    // check whether the caller is the shuffle Manager
    modifier onlyShuffleManager() {
        require(address(ishuffle) == msg.sender, "Caller is not shuffle manager.");
        _;
    }

    // check whether the caller is the game owner
    modifier onlyGameOwner(uint gameId) {
        require(gameOwners[gameId] == msg.sender, "Caller is not game owner.");
        _;
    }

    function cardConfig() external override pure returns (DeckConfig) {
        return DeckConfig.Deck5Card;
    }

    uint256 public largestGameId;
    mapping(uint => uint) shuffleGameId;
    mapping(uint => address) gameOwners;

    constructor(
        IBaseStateManager _ishuffle
    ) {
        ishuffle = _ishuffle;
    }

    // create a new game by a player 
    function newGame() external returns(uint) {
        uint256 gameId = ishuffle.createShuffleGame(2);
        shuffleGameId[++largestGameId] = gameId;
        gameOwners[largestGameId] = msg.sender;
        return gameId;
    }

    function allowJoinGame(
        uint gameId
    ) external onlyGameOwner(gameId) {
        // move the game into "Player Registering" State, 
        bytes memory next = abi.encodeWithSelector(this.moveToShuffleStage.selector, gameId);
        ishuffle.register(shuffleGameId[gameId], next);
    }
    
    function moveToShuffleStage(
        uint gameId
    ) external onlyShuffleManager {
        bytes memory next = abi.encodeWithSelector(this.dealCard0ToPlayer0.selector, gameId);
        ishuffle.shuffle(shuffleGameId[gameId], next);
    }

    function dealCard0ToPlayer0(
        uint gameId
    ) external onlyShuffleManager {
        BitMaps.BitMap256 memory cards;
        cards._data = 1;    // ...0001
        bytes memory next = abi.encodeWithSelector(this.dealCard1ToPlayer1.selector, gameId);
        ishuffle.dealCardsTo(
            shuffleGameId[gameId],
            cards,
            0,
            next
        );
    }

    function dealCard1ToPlayer1(
        uint gameId
    ) external onlyShuffleManager {
        BitMaps.BitMap256 memory cards;
        cards._data = 2;    // ...0010
        bytes memory next = abi.encodeWithSelector(this.openCard0.selector, gameId);
        ishuffle.dealCardsTo(
            shuffleGameId[gameId],
            cards,
            1,
            next
        );
    }

    function openCard0(
        uint gameId
    ) external onlyShuffleManager {
        bytes memory next = abi.encodeWithSelector(this.openCard1.selector, gameId);
        ishuffle.openCards(
            shuffleGameId[gameId],
            0,
            1,
            next
        );
    }

    function openCard1(
        uint gameId
    ) external onlyShuffleManager {
        bytes memory next = abi.encodeWithSelector(this.endGame.selector, gameId);
        ishuffle.openCards(
            shuffleGameId[gameId],
            1,
            1,
            next
        );
    }

    function endGame(
        uint gameId
    ) external onlyShuffleManager {
        // game-specific cleanup
    }
}