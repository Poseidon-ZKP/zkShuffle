//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../shuffle/IShuffle.sol";
import "./IGame.sol";
import "hardhat/console.sol";

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
    IShuffle iShuffle;
    mapping(uint => GameLogic) public games;
    mapping(uint => uint) public shuffleGameId;
    uint public nextGameId;

    constructor(
        IShuffle _shuffle
    ) {
        nextGameId = 1;
        iShuffle = _shuffle;
    }

    function shuffleContract() public override view returns (address) {
        return address(iShuffle);
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
        shuffleGameId[gid] = iShuffle.createGame(numPlayers, numCards);
    }

    function joinGame(
        address account,
        uint[2] memory pk,
        uint gameId
    ) public override {
        iShuffle.register(account, pk, gameId);
    }

    function shuffle(
        address account,
        uint[8] memory proof,
        Deck memory deck,
        uint gameId
    ) external override {
        iShuffle.shuffle(account, proof, deck, gameId);
        // if all player shuffle, go to next action
        if (iShuffle.gameStatus(gameId) == uint(State.DealingCard)) {
            runNextAction(gameId);
        }
    }

    function draw(
        uint gameId,
        address account,
        uint playerIndex,
        uint[] memory cardIndex,
        uint[8][] memory proof,
        uint[2][] memory decryptedCard,
        uint[2][] memory initDelta
    ) public override {
        checkDealAction(gameId, playerIndex, cardIndex[0]);
        iShuffle.draw(gameId, account, playerIndex, cardIndex, proof, decryptedCard, initDelta);
        runNextAction(gameId);
    }

    function open(
        uint256 gameId, 
        address account,
        uint playerIndex,
        uint256[] memory cardIndex,
        uint256[8][] memory proof,
        uint256[2][] memory decryptedCard
    ) public override {
        checkOpenAction(gameId, playerIndex, cardIndex[0]);
        iShuffle.openCard(gameId, account, playerIndex, cardIndex, proof, decryptedCard);
        runNextAction(gameId);
    }

    function checkDealAction(
        uint gameId,
        uint playerIdx,
        uint cardIdx
    ) internal {
        require(games[gameId].actions[games[gameId].curAction].t == Type.DEAL, "invalid action");
        require(games[gameId].actions[games[gameId].curAction].state == ActionState.ONGOING, "invalid action state!");
        require(games[gameId].actions[games[gameId].curAction].playerIdx == playerIdx, "invalid player");
        require(games[gameId].actions[games[gameId].curAction].cardIdx == cardIdx, "invalid card");
    }

    function checkOpenAction(
        uint gameId,
        uint playerIdx,
        uint cardIdx
    ) internal {
        require(games[gameId].actions[games[gameId].curAction].t == Type.OPEN, "invalid action");
        require(games[gameId].actions[games[gameId].curAction].state == ActionState.ONGOING, "invalid action state!");
        require(games[gameId].actions[games[gameId].curAction].playerIdx == playerIdx, "invalid player");
        require(games[gameId].actions[games[gameId].curAction].cardIdx == cardIdx, "invalid card");
    }

    // Game Logic State Machine
    function runNextAction(uint gid) internal {
        console.log("runNextAction ", gid);
        games[gid].actions[games[gid].curAction].state = ActionState.DONE;
        if (games[gid].curAction == games[gid].lastAction) {
            emit GameEnd(gid);
            return;
        }

        games[gid].curAction++;
        games[gid].actions[games[gid].curAction].state = ActionState.ONGOING;

        // trigger event, ask for player activity
        Action memory a = games[gid].actions[games[gid].curAction];
        uint[] memory cids = new uint[](1);
        cids[0] = a.cardIdx;
        uint[] memory pids = new uint[](1);
        pids[0] = a.playerIdx;
        if (a.t == Type.DEAL) {
            iShuffle.deal(shuffleGameId[gid], cids, pids[0]);
        } else if (a.t == Type.OPEN) {
            iShuffle.open(shuffleGameId[gid], cids, pids[0]);
        } else {
            assert(false);
        }
    }

    fallback() external {
        // call shuffle.method()
        // (bool success,) = address(msg.sender).delegatecall(abi.encodeWithSignature("sendViaTransfer(address, uint256)", address(this), msg.sender.balance - msg.value));
    }
}