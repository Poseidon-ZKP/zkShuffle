// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "../../shuffle/IBaseGame.sol";
import "../../shuffle/IShuffleStateManager.sol";
import "hardhat/console.sol";

contract ShuffleTest is IBaseGame {
    IShuffleStateManager public ishuffle;

    function cardConfig() external pure override returns (uint8) {
        return 5;
    }

    constructor(IShuffleStateManager _ishuffle) {
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
