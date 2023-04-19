//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../shuffle/IShuffle.sol";
import "./IGame.sol";

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

contract Game is IGame{
    IShuffle shuffle;
    mapping(uint => GameLogic) public games;
    mapping(uint => uint) public shuffleGameId;
    uint public nextGameId;

    constructor(
        IShuffle _shuffle
    ) {
        nextGameId = 1;
        shuffle = _shuffle;
    }

    function shuffleContract() public override view returns (address) {
        return address(shuffle);
    }

    function newGame(
        uint numCards,
        uint numPlayers,
        Action[] calldata actions
    ) public override returns (uint gid) {
        gid = nextGameId++;
        games[gid].numCards = numCards;
        games[gid].curAction = 0;
        games[gid].lastAction = actions.length - 1;
        for (uint i = 0; i < actions.length; i++) {
            games[gid].actions[i] = actions[i];
        }

        games[gid].numPlayers = numPlayers;
        shuffleGameId[gid] = shuffle.createGame(numPlayers, numCards);
    }

    function joinGame(
        address account,
        uint[2] memory pk,
        uint gameId
    ) public override {
        shuffle.register(account, pk, gameId);
    }

    function runNextAction(uint gid) internal {
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
                shuffle.deal(shuffleGameId[gid], cids, pids[0]);
                // emit Deal(cids, pids);
            } else if (a.t == Type.OPEN) {
                // timelock ?
                shuffle.open(shuffleGameId[gid], cids, pids[0]);
                // emit Open(cids, pids);
            } else {
                assert(false);
            }
        }
    }

    fallback() external {
        // call shuffle.method()
        // (bool success,) = address(msg.sender).delegatecall(abi.encodeWithSignature("sendViaTransfer(address, uint256)", address(this), msg.sender.balance - msg.value));
    }
}