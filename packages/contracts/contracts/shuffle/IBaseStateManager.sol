// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

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
    Play,
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
    // Currently, dealCardsTo can only be called under two states:
    // 1. Shuffle state, this will transit to Play state
    // 2. Play state
    // An error is thrown if dealCardsTo is called under any other states
    // TODO: here we could use bitmap? to save some gas cost
    function dealCardsTo(
        uint256 gameId,
        uint256[] memory cards,
        uint8 playerId,
        bytes calldata next
    ) external;

    // shuffle the remaining deck, this will transit the base state to Shuffle
    function shuffle(uint256 gameId, bytes calldata next) external;

    // transit to error state
    function error(uint256 gameId, bytes calldata next) external;
}