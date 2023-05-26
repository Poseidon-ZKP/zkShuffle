// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "./Deck.sol";

// immutable information of each game
struct ShuffleGameInfo {
    uint8 numCards;
    uint8 numPlayers;
    IShuffleEncryptVerifier encryptVerifier;
}

interface IBaseGame {
    function cardConfig() external view returns (uint8);
}
