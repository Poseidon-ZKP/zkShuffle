// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "../shuffle/Storage.sol";

abstract contract Debug is Storage {

    function set_gameInfo(
        uint gameId,
        uint8 numCards,
        uint8 numPlayers
    ) external {
        //largestGameId = gameId + 1;
        gameInfos[gameId].numCards = numCards;
        gameInfos[gameId].numPlayers = numPlayers;
        if (numCards == 5) {
            gameInfos[gameId].encryptVerifier = IShuffleEncryptVerifier(
                _deck5EncVerifier
            );
        } else {
            console.log("Invalid numCards ", numCards);
            assert(false);
        }
    }

    function set_gameState(
        uint gameId,
        BaseState state
    ) external {
        gameStates[gameId].state = state;
    }

}
