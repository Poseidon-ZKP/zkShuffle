// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "../../shuffle/IBaseGame.sol";
import "../../shuffle/IBaseStateManager.sol";

// State-less Pure game logic contract
// 1. state-less game contract don't care about shuffle-state,
//    so they only impl the game logic interface define in IBaseGame
contract Hilo is IBaseGame {
    IBaseStateManager ishuffle;

    // check whether the caller is the shuffle Manager
    modifier onlyShuffleManager() {
        require(address(ishuffle) == msg.sender, "Caller is not shuffle manager.");
        _;
    }

    function cardConfig() external override pure returns (DeckConfig) {
        return DeckConfig.Deck52Card;
    }

    constructor(
        IBaseStateManager _ishuffle
    ) {
        ishuffle = _ishuffle;
    }

    // only trigger by shuffleStateManager, else SDK need operate with gameContract,
    function newGame(
        uint numPlayers
    ) external override onlyShuffleManager returns (uint gid) {
        // game-specific logic ?
    }

    function joinGame(
        address account,
        uint gameId
    ) external override onlyShuffleManager  {
        // game-specific join logic
    }

    function shuffle(
        uint gameId
    ) external override onlyShuffleManager  {
        // game-specific join logic
    }

    function startGame(
        uint gameId
    ) external override onlyShuffleManager {
        dealCard0ToPlayer0();
    }

    function dealCard0ToPlayer0() public onlyShuffleManager {

    }

    function dealCard1ToPlayer1() external onlyShuffleManager {
    }

    function openCard0() external onlyShuffleManager {
    }

    function openCard1(
        uint gameId
    ) external onlyShuffleManager {
        endGame(gameId);
    }

    function endGame(
        uint gameId
    ) public override onlyShuffleManager {
    }
}