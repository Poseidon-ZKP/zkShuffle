// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "../../shuffle/IBaseGame.sol";
import "../../shuffle/IShuffleStateManager.sol";
import "hardhat/console.sol";

contract ShuffleTest is IBaseGame {
    IBaseStateManager public ishuffle;

    function cardConfig() external override pure returns (DeckConfig) {
        return DeckConfig.Deck5Card;
    }

    constructor(
        IBaseStateManager _ishuffle
    ) {
        ishuffle = _ishuffle;
    }

    fallback() external {
        (bool success, bytes memory data) = address(ishuffle).call(msg.data);
        console.log("ShuffleTest fallback ", success);
        if (!success) {
            console.logBytes(data);
        }
    }

    function dummy() external {
        console.log("ShuffleTest dummy");
    }

}