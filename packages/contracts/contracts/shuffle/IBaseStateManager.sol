// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "./BitMaps.sol";

/** All games share these 6 base state
 * Created: game is created
 * Registration: player registration state
 * Shuffe: the deck is being shuffled
 * Play: the actual game play
 * Error: the game get into a unrecoverable error and is no-longer active
 * Complete: the game has been completed
 */
enum BaseState {
    Created,
    Registration,
    Shuffle,
    Deal,
    Open,
    GameError,
    Complete
}

/**
 * @title Base state manager
 */
interface IBaseStateManager {
    // transit to register player stage
    function register(uint256 gameId, bytes calldata next) external;

    // deal a set of cards to a specific player
    // An error is thrown if dealCardsTo is called under any other states
    function dealCardsTo(
        uint256 gameId,
        BitMaps.BitMap256 memory cards,
        uint256 playerId,
        bytes calldata next
    ) external;

    // shuffle the remaining deck, this will transit the base state to Shuffle
    function shuffle(uint256 gameId, bytes calldata next) external;

    // specify a player to open a specified number of cards
    function openCards(
        uint256 gameId,
        uint256 playerId,
        uint8 openningNum,
        bytes calldata next
    ) external;

    // transit to error state, game devs call specify error handling logic in the callback
    function error(uint256 gameId, bytes calldata next) external;
}