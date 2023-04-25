// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBaseStateManager.sol";
import "./crypto.sol";

struct ShuffleGameInfo {
    uint8 numCards;
    uint8 numPlayers;
    BaseState state;
    address[] playerAddr;
    uint256[] playerPkX;
    uint256[] playerPKY;
    uint256 aggregatePkX;
    uint256 aggregatePkY;
    uint256 nonce;
}

/**
 * @title Shuffle Manager
 * @dev manage all ZK Games
 */
contract ShuffleManager is IBaseStateManager, Ownable {
    // event
    event GameContractCallError(address caller, bytes data);

    // mapping between gameId and game contract address
    mapping(uint256 => address) _activeGames;

    // mapping between gameId and game info
    mapping(uint256 => ShuffleGameInfo) gameInfos;

    // mapping bewteen gameId and current player in turn to action
    mapping(uint256 => uint256) currentPlayerIndex;

    // mapping between gameId and next game contract function to call
    mapping(uint256 => bytes) nextToCall;

    // counter of gameID
    uint256 public largestGameId;

    // check whether the caller is the game owner
    modifier gameOwner(uint256 gameId) {
        require(
            _activeGames[gameId] == msg.sender,
            "Caller is not game owner."
        );
        _;
    }

    // check state
    modifier checkState(uint256 gameId, BaseState state) {
        require(state == gameInfos[gameId].state, "Check state failed");
        _;
    }

    /**
     * create a new shuffle game
     */
    function createShuffleGame(
        ShuffleGameInfo memory gameInfo,
        address gameContract
    ) external returns (uint256) {
        uint256 newGameId = ++largestGameId;
        gameInfos[newGameId] = gameInfo;
        // TODO: do we need this? it should be by default 0?
        currentPlayerIndex[newGameId] = 0;
        _activeGames[newGameId] = gameContract;
        return newGameId;
    }

    /**
     * enter register state, can only be called by game owner
     * currently, we only support player registering during the beginning of the game
     */
    function register(uint256 gameId, bytes calldata next)
        external
        gameOwner(gameId)
        checkState(gameId, BaseState.Created)
    {
        ShuffleGameInfo storage info = gameInfos[gameId];
        info.state = BaseState.Registration;
        nextToCall[gameId] = next;
    }

    /**
     * allow each player register, called by player (SDK)
     */
    function playerRegister(
        uint256 gameId,
        address playerAddress,
        uint256 pkX,
        uint256 pkY
    ) external returns (uint256 pid) {
        require(CurveBabyJubJub.isOnCurve(pkX, pkY), "Invalid public key");
        ShuffleGameInfo storage info = gameInfos[gameId];
        require(info.playerAddr.length < info.numPlayers, "Game full");
        
        // assign pid before push to the array
        pid = info.playerAddr.length;
        
        // update game info
        info.playerAddr.push(playerAddress);
        info.playerPkX.push(pkX);
        info.playerPKY.push(pkY);

        // update aggregated PK
        if (pid == 0) {
            info.aggregatePkX = pkX;
            info.aggregatePkY = pkY;
        } else {
            (info.aggregatePkX, info.aggregatePkY) = CurveBabyJubJub.pointAdd(
                info.aggregatePkX, info.aggregatePkY, pkX, pkY); 
        }

        // if this is the last player to join
        if (pid == info.numPlayers - 1) {
            info.nonce = mulmod(info.aggregatePkX, info.aggregatePkY, CurveBabyJubJub.Q);
            callGameContract(gameId);
        }
    }

    function dealCardsTo(
        uint256 gameId,
        uint256[] memory cards,
        uint8 playerId,
        bytes calldata callback
    ) external gameOwner(gameId) {
    }

    function playerDealCards() external {}

    function shuffle(uint256 gameId, bytes calldata next) external checkState(gameId, BaseState.Registration) {}

    function error(uint256 gameId, bytes calldata next) external {}

    function initDeck(uint256 gameId) internal {

    }

    // switch control to game contract, set the game to error state if the contract call failed
    function callGameContract(uint256 gameId) internal {
        (bool success, bytes memory data) = _activeGames[gameId].call(nextToCall[gameId]);
        if (!success) {
            emit GameContractCallError(_activeGames[gameId], data);
            gameInfos[gameId].state = BaseState.GameError;
        }
    }
}
