//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../shuffle/IShuffle.sol";
import "./IGame.sol";
import "hardhat/console.sol";

enum Type {
    DEAL,
    OPEN
}

enum KernelState {
    NOTSTART,
    ONGOING,
    DONE
}

struct Kernel {
    Type t;
    uint cardIdx;     // Next Version : uint[] for arbitry card/player
    uint playerIdx;
}

struct GameLogic {
    mapping(uint => KernelState) kernelStates;
    uint curKernel;
    uint lastKernel;
    // Next Version : uint[] for concurrency kernel network
    // uint nextKernel;

    uint numPlayers;
}

contract Game is IGame{
    IShuffle iShuffle;
    mapping(uint => GameLogic) public games;
    mapping(uint => uint) public shuffleGameId;
    uint public nextGameId;

    // kernel shared by all games
    // Next Version : Compile DSL workflow to kernels(concurency).
    mapping(uint => Kernel) kernels;
    uint public kernelSize;

    uint numCards;

    constructor(
        IShuffle _shuffle,
        uint _numCards
    ) {
        nextGameId = 1;
        iShuffle = _shuffle;
        numCards = _numCards;
        kernels[0] = Kernel({
            // Deal card 0 to player 0
            t : Type.DEAL,
            cardIdx : 0,
            playerIdx : 0
        });
        kernels[1] = Kernel({
            // Deal card 1 to player 1
            t : Type.DEAL,
            cardIdx : 1,
            playerIdx : 1
        });
        kernels[2] = Kernel({
            // ask player 0 open card 0
            t : Type.OPEN,
            cardIdx : 0,
            playerIdx : 0
        });
        kernels[3] = Kernel({
            // ask player 1 open card 1
            t : Type.OPEN,
            cardIdx : 1,
            playerIdx : 1
        });
        kernelSize = 4;
    }

    function shuffleContract() public override view returns (address) {
        return address(iShuffle);
    }

    function newGame(
        uint numPlayers
    ) public override returns (uint gid) {
        gid = nextGameId++;
        games[gid].curKernel = 0;
        games[gid].lastKernel = kernelSize - 1;
        for (uint i = 0; i < kernelSize; i++) {
            games[gid].kernelStates[i] = KernelState.NOTSTART;
        }

        games[gid].numPlayers = numPlayers;
        shuffleGameId[gid] = iShuffle.createGame(numPlayers, numCards);
        emit GameStart(gid);    // TODO
    }

    function joinGame(
        address account,
        uint[2] memory pk,
        uint gameId
    ) public override {
        uint pid = iShuffle.register(account, pk, gameId);
        emit JoinGame(gameId, pid, account);
    }

    function shuffle(
        address account,
        uint[8] memory proof,
        Deck memory deck,
        uint gameId
    ) external override {
        // TODO : state check(cons. gas)
        iShuffle.shuffle(account, proof, deck, gameId);
        // if all player shuffle, go to next kernel
        if (iShuffle.gameStatus(gameId) == uint(State.DealingCard)) {
            runNextKernel(gameId);
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
        checkDealKernel(gameId, playerIndex, cardIndex[0]);
        iShuffle.draw(gameId, account, playerIndex, cardIndex, proof, decryptedCard, initDelta);
        runNextKernel(gameId);
    }

    function open(
        uint256 gameId, 
        address account,
        uint playerIndex,
        uint256[] memory cardIndex,
        uint256[8][] memory proof,
        uint256[2][] memory decryptedCard
    ) public override {
        checkOpenKernel(gameId, playerIndex, cardIndex[0]);
        iShuffle.openCard(gameId, account, playerIndex, cardIndex, proof, decryptedCard);
        runNextKernel(gameId);
    }

    function checkDealKernel(
        uint gameId,
        uint playerIdx,
        uint cardIdx
    ) internal {
        require(kernels[games[gameId].curKernel].t == Type.DEAL, "invalid kernel");
        require(kernels[games[gameId].curKernel].playerIdx == playerIdx, "invalid player");
        require(kernels[games[gameId].curKernel].cardIdx == cardIdx, "invalid card");
        require(games[gameId].kernelStates[games[gameId].curKernel] == KernelState.ONGOING, "invalid kernel state!");
    }

    function checkOpenKernel(
        uint gameId,
        uint playerIdx,
        uint cardIdx
    ) internal {
        require(kernels[games[gameId].curKernel].t == Type.OPEN, "invalid kernel");
        require(kernels[games[gameId].curKernel].playerIdx == playerIdx, "invalid player");
        require(kernels[games[gameId].curKernel].cardIdx == cardIdx, "invalid card");
        require(games[gameId].kernelStates[games[gameId].curKernel] == KernelState.ONGOING, "invalid kernel state!");
    }

    function deal(
        uint gameId,
        uint[] memory cardIdx,
        uint playerIdx  // MAX_PLAYER means deal to all player
    ) internal {
        emit Deal(gameId, cardIdx, playerIdx);
    }

    function open(
        uint gameId,
        uint[] memory cardIdx,
        uint playerIdx  // MAX_PLAYER means deal to all player
    ) internal {
        emit Open(gameId, cardIdx, playerIdx);
    }

    // Game Logic State Machine
    function runNextKernel(uint gid) internal {
        games[gid].kernelStates[games[gid].curKernel] = KernelState.ONGOING;
    
        // trigger event, ask for player activity
        Kernel memory k = kernels[games[gid].curKernel];
        uint[] memory cids = new uint[](1);
        cids[0] = k.cardIdx;
        uint[] memory pids = new uint[](1);
        pids[0] = k.playerIdx;
        if (k.t == Type.DEAL) {
            deal(shuffleGameId[gid], cids, pids[0]);
        } else if (k.t == Type.OPEN) {
            open(shuffleGameId[gid], cids, pids[0]);
        } else {
            assert(false);
        }

        if (games[gid].curKernel == games[gid].lastKernel) {
            emit GameEnd(gid);
            return;
        }

        games[gid].kernelStates[games[gid].curKernel] = KernelState.DONE;
        games[gid].curKernel++;
    }

    fallback() external {
        // call shuffle.method()
        // (bool success,) = address(msg.sender).delegatecall(abi.encodeWithSignature("sendViaTransfer(address, uint256)", address(this), msg.sender.balance - msg.value));
    }
}