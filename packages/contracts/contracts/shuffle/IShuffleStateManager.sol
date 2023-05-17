// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "./BitMaps.sol";
import "./Deck.sol";

/** All games share these 6 base state
 * Created: game is created
 * Registration: player registration state
 * Shuffe: the deck is being shuffled
 * Play: the actual game play
 * Error: the game get into a unrecoverable error and is no-longer active
 * Complete: the game has been completed
 */
enum BaseState {
    Uncreated, // Important to keep this to avoid EVM default 0 value
    Created,
    Registration,
    Shuffle,
    Deal,
    Open,
    GameError,
    Complete
}

// mutable state of each game
struct ShuffleGameState {
    // game state
    BaseState state;
    // the index of the card being openned now
    uint8 openning;
    // the index of the player who needs to take action now
    uint256 curPlayerIndex;
    // aggregated PK X coordinate
    uint256 aggregatePkX;
    // aggregated PK Y coordinate
    uint256 aggregatePkY;
    // nonce
    uint256 nonce;
    // a mapping between playerId and number of cards
    // in player's hand
    mapping(uint256 => uint256) playerHand;
    // list of player's addresses
    address[] playerAddrs;
    // list of signing addresses, could be different to
    // the player address in the case of delegate/ephermal account,
    // must be the same order as playerAddrs
    address[] signingAddrs;
    // player PK, X coordinate
    uint256[] playerPkX;
    // player PK, Y coordinate
    uint256[] playerPKY;
    // the current deck of the game
    Deck deck;
}

/**
 * @title Base state manager
 */
interface IShuffleStateManager {
    // invalid card index or player index
    function INVALID_INDEX() external view returns (uint256);

    function createShuffleGame(uint8 numPlayers) external returns (uint256);

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

    // end game
    function endGame(uint256 gameId) external;

    // public view function
    function getNumCards(uint256 gameId) external view returns (uint256);

    function curPlayerIndex(uint gameId) external view returns (uint);

    // return decrypt record of a certain card
    function getDecryptRecord(
        uint gameId,
        uint cardIdx
    ) external view returns (BitMaps.BitMap256 memory);

    // Returns the aggregated public key for all players.
    function queryAggregatedPk(
        uint256 gameId
    ) external view returns (uint px, uint py);

    // Returns the value of the `cardIndex`-th card in the `gameId`-th game.
    function queryCardValue(
        uint256 gameId,
        uint256 cardIndex
    ) external view returns (uint256);

    // Returns the player index in the `gameId`-th game.
    function getPlayerIdx(
        uint256 gameId,
        address player
    ) external view returns (uint256);

    event Register(
        uint256 indexed gameId,
        uint256 playerId,
        address playerAddr
    );
}
