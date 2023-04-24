//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IShuffle.sol";

// All games share these 5 base state
// Registration: player registration state
// Shuffe: the deck is being shuffled
// Play: the actual game play
// Error: the game get into a unrecoverable error and is no-longer active 
// Complete: the game has been completed
enum BaseState {
    Registration,
    Shuffle,
    Play,
    Error,
    Complete
}

// Base State Manager Interface
interface IBaseStateManager {
    function dealCardsTo(uint256[] memory cards, uint8 playerId) external;
    function transitState(BaseState newState) external;
}

// Hilo Contract 
contract Hilo {
    function start(IBaseStateManager manager) external {
        // deal card to player 0
        uint[] memory cards = new uint[](1);
        cards[0] = 0;
        manager.dealCardsTo(cards, 0);
        // deal card to player 1
        
    }
}

// keccak("fold(IStateManager)")[4:]
abstract contract GameManager is IBaseStateManager {

    // mapping between gameID and game contract address
    mapping(uint256 => address) _activeGames;

    // 

    // create game
    // generate card setup
    // draw game
    function startNewGame(address gameId) external {
    }

    // change a game's state to deal a set of card to a specific player 
    function dealCardsTo(uint256[] memory cards, uint8 playerId) external {
        
    }

    function transitState(BaseState newState) external {

    }

    function doAction(uint256 gameId, bytes4 actionId, bytes calldata actionData) external {
        // verify proof
        _activeGames[gameId].staticcall(abi.encodePacked(actionId, this, actionData));
        // emit some events
        // and etc
    }

}