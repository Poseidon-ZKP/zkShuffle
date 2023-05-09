// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "../shuffle/Storage.sol";

abstract contract Debug is Storage {

    function set_gameInfo(
        uint gameId,
        uint8 numCards,
        uint8 numPlayers
    ) external {
        largestGameId = gameId + 1;
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

    function initDeck(
        uint gameId
    ) external {
        ShuffleGameState storage state = gameStates[gameId];
        zkShuffleCrypto.initDeck(state.deck);
    }

    function set_playerTurn(
        uint gameId,
        address player
    ) external {
        ShuffleGameState storage state = gameStates[gameId];
        state.playerAddrs.push(player);
        state.playerAddrs[state.curPlayerIndex] = player;
    }

}
