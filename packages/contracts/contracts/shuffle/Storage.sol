// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IShuffleStateManager.sol";
import "./ECC.sol";
import "./IBaseGame.sol";
import "./BitMaps.sol";

// #if SHUFFLE_UNIT_TEST
import "hardhat/console.sol";

// #endif

/// @title Storage Layout
contract Storage {
    // currently, all the decks shares the same decrypt circuits
    IDecryptVerifier public decryptVerifier;

    // Encryption verifier for 5 cards deck
    address _deck5EncVerifier;

    // Encryption verifier for 30 cards deck
    address _deck30EncVerifier;

    // Encryption verifier for 50 cards deck
    address _deck52EncVerifier;

    // mapping between gameId and game contract address
    mapping(uint256 => address) _activeGames;

    // mapping between gameId and game info
    //  (game info is immutable once a game is created)
    mapping(uint256 => ShuffleGameInfo) gameInfos;

    // mapping between gameId and game state
    mapping(uint256 => ShuffleGameState) gameStates;

    // mapping between gameId and next game contract function to call
    mapping(uint256 => bytes) nextToCall;

    // counter of gameID
    uint256 public largestGameId;
}
