// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "../../shuffle/IBaseGame.sol";
import "../../shuffle/IBaseStateManager.sol";

// State-less Pure game logic contract
// 1. state-less game contract don't care about shuffle-state,
//    so they only impl the game logic interface define in IBaseGame
contract Hilo is IBaseGame {
    IBaseStateManager ishuffle;

    function cardConfig() external override pure returns (DeckConfig) {
        return DeckConfig.Deck52Card;
    }

    bool created;

    constructor(
        IBaseStateManager _ishuffle
    ) {
        ishuffle = _ishuffle;
    }

    // create a new game by a player 
    function newGame() {
        uint256 gameId = ishuffle.createShuffleGame(2);
        created = true;
        // move the game into "Player Registering" State, 
        // a.k.a. BaseState.Register
        ishuffle.register(gameId, abi.encode("moveToShuffleStage"));
    }
    
    function moveToShuffleStage(
        uint gameId
    ) internal {
        ishuffle.shuffle(gameId, abi.encode("dealCard0ToPlayer0"));
    }

    function dealCard0ToPlayer0(
        uint gameId
    ) internal  {
        BitMaps.BitMap256 memory cards;
        cards._data = 1;    // ...0001
        bytes memory next = abi.encodeWithSelector(this.dealCard1ToPlayer1.selector, gameId);
        ishuffle.dealCardsTo(
            gameId,
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
            gameId,
            cards,
            0,
            next
        );
    }

    function openCard0(
        uint gameId
    ) external onlyShuffleManager {
        bytes memory next = abi.encodeWithSelector(this.openCard1.selector, gameId);
        ishuffle.openCards(
            gameId,
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
            gameId,
            1,
            1,
            next
        );
    }

    function endGame(
        uint gameId
    ) public onlyShuffleManager {
        // game-specific cleanup
    }
}