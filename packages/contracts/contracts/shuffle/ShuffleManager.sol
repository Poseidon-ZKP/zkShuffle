// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBaseStateManager.sol";
import "./ECC.sol";
import "./Deck.sol";
import "./IBaseGame.sol";
import "./BitMaps.sol";

struct ShuffleGameInfo {
    uint8 numCards;
    uint8 numPlayers;
    IShuffleEncryptVerifier encryptVerifier;
}

struct ShuffleGameState {
    BaseState state;
    uint256 curPlayerIndex;
    uint256 aggregatePkX;
    uint256 aggregatePkY;
    uint256 nonce;
    address[] playerAddrs;
    address[] signingAddrs;
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
    //  (game info is immutable once a game is created)
    mapping(uint256 => ShuffleGameInfo) gameInfos;

    // mapping between gameId and game state
    mapping(uint256 => ShuffleGameState) gameStates;

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
        require(state == gameStates[gameId].state, "Check state failed");
        _;
    }

    // check if this is your turn
    modifier checkTurn(uint256 gameId) {
        ShuffleGameState storage state = gameStates[gameId];
        require(
            msg.sender == state.playerAddrs[state.curPlayerIndex] ||
            msg.sender == state.signingAddrs[state.curPlayerIndex],
            "not your turn!"
        );
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
        // TODO: do we need to explicit start
        // an intialization logic of gameStates[newGameId]?
        _activeGames[newGameId] = gameContract;

        // set up verifier contract according to deck type
        if (IBaseGame(gameContract).cardConfig() == DeckConfig.Deck30Card) {
            gameInfos[newGameId].encryptVerifier = IShuffleEncryptVerifier(
                _deck30EncVerifier
            );
        } else if (
            IBaseGame(gameContract).cardConfig() == DeckConfig.Deck52Card
        ) {
            gameInfos[newGameId].encryptVerifier = IShuffleEncryptVerifier(
                _deck52EncVerifier
            );
        } else {
            gameStates[newGameId].state = BaseState.GameError;
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
        ShuffleGameState storage state = gameStates[gameId];
        state.state = BaseState.Registration;
        nextToCall[gameId] = next;
    }

    /**
     * register, called by player (SDK)
     * TODO: revist why do we need a playerAddress here
     * Note: we don't need to check turn here
     */
    function playerRegister(
        uint256 gameId,
        address signingAddr,
        uint256 pkX,
        uint256 pkY
    ) external returns (uint256 pid) {
        require(CurveBabyJubJub.isOnCurve(pkX, pkY), "Invalid public key");
        ShuffleGameInfo memory info = gameInfos[gameId];
        ShuffleGameState storage state = gameStates[gameId];
        require(state.playerAddrs.length < info.numPlayers, "Game full");

        // assign pid before push to the array
        pid = state.playerAddrs.length;

        // update game info
        state.playerAddrs.push(msg.sender);
        state.signingAddrs.push(signingAddr);
        state.playerPkX.push(pkX);
        state.playerPKY.push(pkY);

        // update aggregated PK
        if (pid == 0) {
            state.aggregatePkX = pkX;
            state.aggregatePkY = pkY;
        } else {
            (state.aggregatePkX, state.aggregatePkY) = CurveBabyJubJub.pointAdd(
                state.aggregatePkX,
                state.aggregatePkY,
                pkX,
                pkY
            );
        }

        // if this is the last player to join
        if (pid == info.numPlayers - 1) {
            state.nonce = mulmod(
                state.aggregatePkX,
                state.aggregatePkY,
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
        ShuffleGameState storage state = gameStates[gameId];
        state.state = BaseState.Shuffle;
        nextToCall[gameId] = next;
    }

    /**
     * shuffle, called by each player (SDK)
     */
    function playerShuffle(
        uint256 gameId,
        uint256[8] memory proof,
        CompressedDeck memory compDeck
    ) external checkState(gameId, BaseState.Shuffle) checkTurn(gameId) {
        ShuffleGameInfo memory info = gameInfos[gameId];
        ShuffleGameState storage state = gameStates[gameId];
        info.encryptVerifier.verifyProof(
            [proof[0], proof[1]],
            [[proof[2], proof[3]], [proof[4], proof[5]]],
            [proof[6], proof[7]],
            zkShuffleCrypto.shuffleEncPublicInput(
                compDeck,
                zkShuffleCrypto.getCompressedDeck(state.deck),
                state.nonce,
                state.aggregatePkX,
                state.aggregatePkY
            )
        );
        zkShuffleCrypto.setDeckUnsafe(compDeck, state.deck);
        state.curPlayerIndex += 1;
        if (state.curPlayerIndex == state.playerAddrs.length) {
            state.curPlayerIndex = 0;
            callGameContract(gameId);
        }
    }

    /**
     * can only called by game contract,
     * specifiy a set of cards to be dealed to a players
     */
    function dealCardsTo(
        uint256 gameId,
        BitMaps.BitMap256 memory cards,
        uint256 playerId,
        bytes calldata next
    ) external gameOwner(gameId) {
        ShuffleGameState storage state = gameStates[gameId];
        // TODO: maybe add a checking of the remaining deck size
        // this check could removed if we formally verified the contract
        require(state.curPlayerIndex == 0, "internal erorr! ");
        require(
            playerId < gameInfos[gameId].numPlayers, 
            "game contract error: deal card to an invalid player id");
        
        // change to Play state if not already in the state
        if (state.state != BaseState.Play) {
            state.state = BaseState.Play;
        }
        state.deck.cardsToDeal = cards;
        state.deck.playerToDeal = playerId;
        
        // we assume a game must have at least 2 or more players,
        // otherwise the game should stop
        if (playerId == 0) {
            state.curPlayerIndex = 1;
        }
        nextToCall[gameId] = next;
    }

    /**
     * deal (draw) card from each player (SDK)
     */
    function playerDealCards(
        uint256 gameId,
        DecryptProof[] memory proofs,
        Card[] memory decryptedCards,
        uint256[2][] memory initDeltas
    ) external checkState(gameId, BaseState.Play) checkTurn(gameId) {
        ShuffleGameInfo memory info = gameInfos[gameId];
        ShuffleGameState storage state = gameStates[gameId];
        uint256 numberCardsToDeal = BitMaps.memberCountUpTo(state.deck.cardsToDeal, info.numCards);
        require(
            proofs.length == numberCardsToDeal,
            "number of proofs is wrong!"
        );
        require(
            decryptedCards.length == numberCardsToDeal,
            "number of decrypted cards is wrong!"
        );
        require(
            initDeltas[0].length == numberCardsToDeal && initDeltas[0].length == numberCardsToDeal,
            "init delta's shape is invalid!"
        );
        uint256 counter = 0;
        for (uint256 cid = 0; cid < uint256(info.numCards); cid++) {
            if (BitMaps.get(state.deck.cardsToDeal, cid)) {
                // update decrypted card
                _updateDecryptedCard(gameId, cid, proofs[counter], decryptedCards[counter], initDeltas[counter]);
                counter ++;
            }
        }
        state.curPlayerIndex ++;
        if (state.curPlayerIndex == state.deck.playerToDeal) {
            state.curPlayerIndex ++;
        }
        if (state.curPlayerIndex == info.numPlayers) {
            state.curPlayerIndex = 0;
            callGameContract(gameId);
        }
    }

    /**
     * update a decrypted card.
     */
    function _updateDecryptedCard(
        uint256 gameId,
        uint256 cardIndex,
        DecryptProof memory proof,
        Card memory decryptedCard,
        uint256[2] memory initDelta
    ) internal {
        ShuffleGameState storage state = gameStates[gameId];
        require(
            BitMaps.get(state.deck.dealRecord[cardIndex], state.curPlayerIndex),
            "Card has been dealt to this player already"
        );
        // recover Y0 and Y1 from the current X0 and X1
        state.deck.Y0[cardIndex] = CurveBabyJubJub.recoverY(
            state.deck.X0[cardIndex], 
            initDelta[0],
            BitMaps.get(state.deck.selector0, cardIndex));
        state.deck.Y1[cardIndex] = CurveBabyJubJub.recoverY(
            state.deck.X1[cardIndex],
            initDelta[1],
            BitMaps.get(state.deck.selector1, cardIndex));
        
        decryptVerifier.verifyProof(proof.A, proof.B, proof.C, proof.PI);
        // update X1 and Y1 in the deck
        state.deck.X1[cardIndex] = decryptedCard.X;
        state.deck.Y1[cardIndex] = decryptedCard.Y;
        BitMaps.set(state.deck.dealRecord[state.curPlayerIndex], cardIndex);
    }

    function error(uint256 gameId, bytes calldata next) external {}

    function initDeck(uint256 gameId) internal {}

    // switch control to game contract, set the game to error state if the contract call failed
    function callGameContract(uint256 gameId) internal {
        (bool success, bytes memory data) = _activeGames[gameId].call(
            nextToCall[gameId]
        );
        if (!success) {
            emit GameContractCallError(_activeGames[gameId], data);
            gameStates[gameId].state = BaseState.GameError;
        }
    }
}
