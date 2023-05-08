// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "../shuffle/Storage.sol";

abstract contract Debug is Storage {

    function set_gameState(
        uint gameId,
        BaseState state
    ) external {
        gameStates[gameId].state = state;
    }

}
