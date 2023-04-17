// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
import "../shuffle/IShuffle.sol";

enum CardState {
    INIT,
    SHUFFLING,
    FULLBLIND,
    PARTIALBLIND,
    OPEN
}

interface ICard {
    function register(address account, uint256[2] memory pk, uint256 gameId) external;
    function shuffle(uint256 gameId, uint256[8] memory proof) external;
    function decrpt(
        uint gid,
        uint cid, // uint[] memory cid,
        uint pid
    ) external;

    function deal(uint[] memory idx, uint[] memory player) external;
    function open(uint[] memory idx, uint[] memory player) external;

    event Reigster(uint256 indexed gameId, uint256 playerId, address account);
    event Shuffle();
    event Deal(
        uint[] cardIdx,
        uint[] playerIdx
    );
    event Open(
        uint[] cardIdx,
        uint[] playerIdx
    );
}

