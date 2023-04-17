// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
import "./ICard.sol";

// V2 :
// 1. Arbitry cards/players, 
// 2. concurrency action network
// 3. Compile DSL workflow to actions
//    (1) depandancy resolve.
//    (2) concurency
//    (3) optimize multi action in one.


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

// 1. Cards : num
// 2. action(deal/open) workflow
struct GameLogic {
    uint numCards;
    mapping(uint => Action) actions;    // Next Version : Compile DSL workflow to actions(concurency).
    uint curAction;
    uint lastAction;
    // Next Version : uint[] for concurrency action network
    // uint nextAction;

    uint numPlayers;
}

contract Game is ICard {
    IShuffle iShuffle;

    mapping(uint => GameLogic) public games;
    uint public gameId;

    constructor(
        IShuffle shuffleContract
    ) {
        gameId = 0;
        iShuffle = shuffleContract;
    }

    function newGame(
        uint numCards,
        uint numPlayers,
        Action[] calldata actions
    ) public returns (uint gid) {
        gid = ++gameId;
        games[gid].numCards = numCards;
        games[gid].curAction = 0;
        games[gid].lastAction = actions.length - 1;
        for (uint i = 0; i < actions.length; i++) {
            games[gid].actions[i] = actions[i];
        }

        games[gid].numPlayers = numPlayers;
        iShuffle.setGameSettings(numPlayers, numCards, gameId);     // TODO : gameId mapping
    }

    function runNextAction(uint gid) public {
        if (games[gid].curAction <= games[gid].lastAction &&
            games[gid].actions[games[gid].curAction].state == ActionState.DONE) {
    
            games[gid].curAction++;
            games[gid].actions[games[gid].curAction].state = ActionState.ONGOING;

            // trigger event, ask for player activity
            Action memory a = games[gid].actions[games[gid].curAction];
            uint[] memory cids = new uint[](1);
            cids[0] = a.cardIdx;
            uint[] memory pids = new uint[](1);
            pids[0] = a.playerIdx;
            if (a.t == Type.DEAL) {
                emit Deal(cids, pids);
            } else if (a.t == Type.OPEN) {
                emit Open(cids, pids);
            } else {
                assert(false);
            }
        }
    }

    // if player did't action in time, anyone can trigger refund
    function challenge(
        uint playerId
    ) public {
    }



    // ICard Impl
    function deal(uint[] memory idx, uint[] memory player) override external {
        if (player[0] == type(uint).max) {
            // all player decrypt on-chain
        } else {
            // all player except player-id decrypt on-chain
        }
    }

    function open(uint[] memory idx, uint[] memory player) override external {

    }


    function register(address account, uint256[2] memory pk, uint256 gameId) override public {

    }

    function shuffle(uint256 gameId, uint256[8] memory proof) override public {

    }

    function decrpt(
        uint gid,
        uint cid,
        uint pid
    ) override public {
        // iShuffle.decrypt

        // check


        // state transition
        runNextAction(gid);
    }
}
