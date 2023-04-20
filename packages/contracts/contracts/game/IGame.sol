//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../shuffle/IShuffle.sol";

enum Type {
    DEAL,
    OPEN
}

enum ActionState {
    NOTSTART,
    ONGOING,
    DONE
}

struct Action {
    Type t;
    ActionState state;
    uint cardIdx;     // Next Version : uint[] for arbitry card/player
    uint playerIdx;
}

// 1. Game Contract Need Implement IGame
//    (1) shuffle : card state
//    (2) game : logic
// 2. SDK only operate with IGame
// 3. IGame should be Sematic Complete
interface IGame {
    // v1 
    function shuffleContract() external view returns (address);

    function newGame(
        uint numCards,
        uint numPlayers,
        Action[] calldata actions
    ) external returns (uint gid);

    // v2
    // function newGame(
    //     uint numCards,
    //     uint numPlayers
    // ) external returns (uint gid);

    function joinGame(
        address account,
        uint[2] memory pk,
        uint gameId
    ) external;

    function shuffle(
        address account,
        uint256[8] memory proof,
        Deck memory deck,
        uint256 gameId
    ) external;

    function draw(
        uint gameId,
        address account,
        uint playerIndex,
        uint[] memory cardIndex,
        uint[8][] memory proof,
        uint[2][] memory decryptedCard,
        uint[2][] memory initDelta
    ) external;

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