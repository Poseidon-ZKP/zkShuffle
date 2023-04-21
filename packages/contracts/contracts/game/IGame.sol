//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../shuffle/IShuffle.sol";

// 1. Game Contract Need Implement IGame
//    (1) shuffle : card state
//    (2) game : logic
// 2. SDK only operate with IGame
// 3. IGame should be Sematic Complete
interface IGame {
    function shuffleContract() external view returns (address);

    // Create Game : Define Game Logic, Assign Game ID`
    function newGame(
        uint numPlayers
    ) external returns (uint gid);

    // Player Join Game
    function joinGame(
        address account,
        uint[2] memory pk,
        uint gameId
    ) external;

    // Player Shaffle Cards
    function shuffle(
        address account,
        uint256[8] memory proof,
        Deck memory deck,
        uint256 gameId
    ) external;

    // Player decrypt Cards in it's deal turn
    function draw(
        uint gameId,
        address account,
        uint playerIndex,
        uint[] memory cardIndex,
        uint[8][] memory proof,
        uint[2][] memory decryptedCard,
        uint[2][] memory initDelta
    ) external;

    // Player open Cards in it's open turn
    function open(
        uint256 gameId, 
        address account,
        uint playerIndex,
        uint256[] memory cardIndex,
        uint256[8][] memory proof,
        uint256[2][] memory decryptedCard
    ) external;

    event GameStart(
        uint256 indexed gameId
    );

    event JoinGame(
        uint256 indexed gameId,
        uint256 playerId,
        address playerAddr
    );

    event GameEnd(
        uint indexed gameId
    );

    event Deal(
        uint indexed gameId,
        uint[] cardId,
        uint playerId
    );

    event Open(
        uint indexed gameId,
        uint[] cardId,
        uint playerId
    );
}