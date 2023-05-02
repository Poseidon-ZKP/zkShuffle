// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "./Deck.sol";


interface IBaseGame {
    function cardConfig() external view returns (DeckConfig);
    function newGame(uint numPlayers) external returns (uint gid);
    function joinGame(address account, uint gameId) external;
    function shuffle(uint gameId) external;
    function startGame(uint gameId) external;
    function endGame(uint gameId) external;
}