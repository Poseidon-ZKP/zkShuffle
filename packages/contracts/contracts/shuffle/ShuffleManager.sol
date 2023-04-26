// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBaseStateManager.sol";
import "./ECC.sol";
import "./Card.sol";
import "./IBaseGame.sol";

struct ShuffleGameInfo {
    uint8 numCards;
    uint8 numPlayers;
    BaseState state;
    IShuffleEncryptVerifier encryptVerifier;
    uint256 curPlayerIndex;
    uint256 aggregatePkX;
    uint256 aggregatePkY;
    uint256 nonce;
    address[] playerAddrs;
    uint256[] playerPkX;
    uint256[] playerPKY;
    Deck deck;
}

/**
 * @title Shuffle Manager
 * @dev manage all ZK Games
 */
contract ShuffleManager is IBaseStateManager, Ownable {
    // event
    event GameContractCallError(address caller, bytes data);

    // currently, all the decks shares the same decrypt circuits
    IDecryptVerifier public decryptVerifier;

    // Encryption verifier for 30 cards deck
    address _deck30EncVerifier;

    // Encryption verifier for 50 cards deck
    address _deck52EncVerifier;

    // mapping between gameId and game contract address
    mapping(uint256 => address) _activeGames;

    // mapping between gameId and game info
    // TODO: split into two things, gameInfos (immutable) and gameStates (mutable)
    mapping(uint256 => ShuffleGameInfo) gameInfos;

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

    // check if this is your turn
    modifier checkTurn(uint256 gameId, address playerAddr){
        ShuffleGameInfo memory info = gameInfos[gameId];
        require(playerAddr == info.playerAddrs[info.curPlayerIndex]);
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
        gameInfos[newGameId].curPlayerIndex = 0;
        _activeGames[newGameId] = gameContract;
        
        // set up verifier contract according to deck type
        if(IBaseGame(gameContract).cardConfig() == DeckConfig.Deck30Card) {
            gameInfos[newGameId].encryptVerifier = IShuffleEncryptVerifier(_deck30EncVerifier);
        } else if (IBaseGame(gameContract).cardConfig() == DeckConfig.Deck52Card) {
            gameInfos[newGameId].encryptVerifier = IShuffleEncryptVerifier(_deck52EncVerifier);
        } else {
            gameInfos[newGameId].state = BaseState.GameError;
        }
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
     * register, called by player (SDK)
     * TODO: revist why do we need a playerAddress here
     * Note: we don't need to check turn here
     */
    function playerRegister(
        uint256 gameId,
        address playerAddress,
        uint256 pkX,
        uint256 pkY
    ) external returns (uint256 pid) {
        require(CurveBabyJubJub.isOnCurve(pkX, pkY), "Invalid public key");
        ShuffleGameInfo storage info = gameInfos[gameId];
        require(info.playerAddrs.length < info.numPlayers, "Game full");

        // assign pid before push to the array
        pid = info.playerAddrs.length;

        // update game info
        info.playerAddrs.push(playerAddress);
        info.playerPkX.push(pkX);
        info.playerPKY.push(pkY);

        // update aggregated PK
        if (pid == 0) {
            info.aggregatePkX = pkX;
            info.aggregatePkY = pkY;
        } else {
            (info.aggregatePkX, info.aggregatePkY) = CurveBabyJubJub.pointAdd(
                info.aggregatePkX,
                info.aggregatePkY,
                pkX,
                pkY
            );
        }

        // if this is the last player to join
        if (pid == info.numPlayers - 1) {
            info.nonce = mulmod(
                info.aggregatePkX,
                info.aggregatePkY,
                CurveBabyJubJub.Q
            );
            callGameContract(gameId);
        }
    }

    /**
     * enter shuffle state, can only be called by game owner
     */
    function shuffle(uint256 gameId, bytes calldata next)
        external
        gameOwner(gameId)
    {
        ShuffleGameInfo storage info = gameInfos[gameId];
        info.state = BaseState.Shuffle;
        nextToCall[gameId] = next;
    }

    /**
     * shuffle, called by each player (SDK)
     */
    function playerShuffle(
        uint256 gameId,
        address playerAddress,
        uint256[8] memory proof,
        Deck memory deck) 
        external 
        checkState(gameId, BaseState.Shuffle) 
        checkTurn(gameId, playerAddress)
    {
        ShuffleGameInfo storage info = gameInfos[gameId];
        info.encryptVerifier.verifyProof(
            [proof[0], proof[1]],
            [[proof[2], proof[3]], [proof[4], proof[5]]],
            [proof[6], proof[7]],
            zkShuffleCrypto.shuffleEncPublicInput(deck, info.deck, info.nonce, info.aggregatePkX, info.aggregatePkY)
        );
        info.deck = deck;
        info.curPlayerIndex += 1;
        if (info.curPlayerIndex == info.numPlayers) {
            info.curPlayerIndex = 0;
            callGameContract(gameId);
        }
    }

    function dealCardsTo(
        uint256 gameId,
        uint256[] memory cards,
        uint8 playerId,
        bytes calldata callback
    ) external gameOwner(gameId) {}

    function playerDealCards() external {}

    function error(uint256 gameId, bytes calldata next) external {}

    function initDeck(uint256 gameId) internal {}

    // switch control to game contract, set the game to error state if the contract call failed
    function callGameContract(uint256 gameId) internal {
        (bool success, bytes memory data) = _activeGames[gameId].call(
            nextToCall[gameId]
        );
        if (!success) {
            emit GameContractCallError(_activeGames[gameId], data);
            gameInfos[gameId].state = BaseState.GameError;
        }
    }
}
