// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBaseStateManager.sol";
import "./ECC.sol";
import "./IBaseGame.sol";
import "./BitMaps.sol";
import "./Storage.sol";
import "hardhat/console.sol";

/**
 * @title Shuffle Manager
 * @dev manage all ZK Games
 */
// #if SHUFFLE_UNIT_TEST
import "../debug/Debug.sol";
contract ShuffleManager is IBaseStateManager, Debug, Ownable {
// #else
contract ShuffleManager is IBaseStateManager, Storage, Ownable {
// #endif

    // event
    event GameContractCallError(address caller, bytes data);

    event PlayerTurn (
        uint256 gameId,
        uint256 playerIndex,
        BaseState state
    );

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
        // console.log("check state ", uint(state));
        // console.log("game ", gameId);
        // console.log("game state ", uint(gameStates[gameId].state));
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

    constructor(
        address decryptVerifier_,
        address deck52EncVerifier,
        address deck30EncVerifier,
        address deck5EncVerifier
    ) {
        _deck52EncVerifier = deck52EncVerifier;
        _deck30EncVerifier = deck30EncVerifier;
        _deck5EncVerifier = deck5EncVerifier;
        decryptVerifier = IDecryptVerifier(decryptVerifier_);
    }

    // get number of card of a gameId
    function gameCardNum(uint256 gameId) public view override returns(uint256) {
        require(gameId <= largestGameId, "Invalid gameId");
        return gameInfos[gameId].numCards;
    }

    function gameState(uint256 gameId) public view returns(uint256) {
        require(gameId <= largestGameId, "Invalid gameId");
        return uint(gameStates[gameId].state);
    }

    // get the current player index (who need to take action)
    function curPlayerIndex(uint256 gameId) public view override returns(uint256) {
        require(gameId <= largestGameId, "Invalid gameId");
        return gameStates[gameId].curPlayerIndex;
    }

    // get decrypt record of a single card
    function gameCardDecryptRecord(uint256 gameId, uint256 cardIdx) public view override returns(BitMaps.BitMap256 memory) {
        require(gameId <= largestGameId, "Invalid gameId");
        require(cardIdx < gameInfos[gameId].numCards, "Invalid cardIdx");
        return gameStates[gameId].deck.decryptRecord[cardIdx];
    }

    // Returns the aggregated public key for all players.
    function queryAggregatedPk(
        uint256 gameId
    ) external view override returns (uint px, uint py) {
        require(
            gameStates[gameId].state != BaseState.Registration,
            "aggregated pk is not ready"
        );
        return (gameStates[gameId].aggregatePkX, gameStates[gameId].aggregatePkY);
    }

    // Returns Deck Config.
    function cardConfig(
        uint gameId
    ) external view returns (DeckConfig) {
        return IBaseGame(_activeGames[gameId]).cardConfig();
    }

    function queryDeck(
        uint gameId
    ) external view returns (
        uint[] memory X0,
        uint[] memory X1,
        uint[] memory Y0,
        uint[] memory Y1,
        BitMaps.BitMap256 memory selector0,
        BitMaps.BitMap256 memory selector1,
        BitMaps.BitMap256 memory cardsToDeal
    ) {
        X0 = gameStates[gameId].deck.X0;
        Y0 = gameStates[gameId].deck.Y0;
        X1 = gameStates[gameId].deck.X1;
        Y1 = gameStates[gameId].deck.Y1;
        selector0 = gameStates[gameId].deck.selector0;
        selector1 = gameStates[gameId].deck.selector1;
        cardsToDeal = gameStates[gameId].deck.cardsToDeal;
    }

    /**
     * create a new shuffle game (call by the game contract)
     */
    function createShuffleGame(uint8 numPlayers) external override returns (uint256) {
        uint256 newGameId = ++largestGameId;
        gameInfos[newGameId].numPlayers = numPlayers;

        // TODO: do we need to explicit start
        // an intialization logic of gameStates[newGameId]?
        _activeGames[newGameId] = msg.sender;

        ShuffleGameState storage state = gameStates[newGameId];

        // set up verifier contract according to deck type
        if (IBaseGame(msg.sender).cardConfig() == DeckConfig.Deck5Card) {
            gameInfos[newGameId].encryptVerifier = IShuffleEncryptVerifier(
                _deck5EncVerifier
            );
            gameInfos[newGameId].numCards = 5;
        } else if (IBaseGame(msg.sender).cardConfig() == DeckConfig.Deck30Card) {
            gameInfos[newGameId].encryptVerifier = IShuffleEncryptVerifier(
                _deck30EncVerifier
            );
            gameInfos[newGameId].numCards = 30;
        } else if (
            IBaseGame(msg.sender).cardConfig() == DeckConfig.Deck52Card
        ) {
            gameInfos[newGameId].encryptVerifier = IShuffleEncryptVerifier(
                _deck52EncVerifier
            );
            gameInfos[newGameId].numCards = 52;
        } else {
            state.state = BaseState.GameError;
        }

        // init deck
        zkShuffleCrypto.initDeck(state.deck);

        return newGameId;
    }

    /**
     * [Game Contract]: enter register state, can only be called by game owner
     * currently, we only support player registering during the beginning of the game
     */
    function register(uint256 gameId, bytes calldata next)
        external override
        gameOwner(gameId)
        checkState(gameId, BaseState.Created)
    {
        ShuffleGameState storage state = gameStates[gameId];
        state.state = BaseState.Registration;
        nextToCall[gameId] = next;
    }

    /**
     * [SDK]: register, called by player
     * Note: we don't need to check turn here
     */
    function playerRegister(
        uint256 gameId,
        address signingAddr,
        uint256 pkX,
        uint256 pkY
    ) external checkState(gameId, BaseState.Registration) returns (uint256 pid) {
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
        emit Register(gameId, pid, msg.sender);

        // if this is the last player to join
        if (pid == info.numPlayers - 1) {
            state.nonce = mulmod(
                state.aggregatePkX,
                state.aggregatePkY,
                CurveBabyJubJub.Q
            );
            _callGameContract(gameId);
        }
    }

    /**
     * [Game Contract]: enter shuffle state, can only be called by game owner
     */
    function shuffle(uint256 gameId, bytes calldata next)
        external override
        gameOwner(gameId)
    {   
        ShuffleGameState storage state = gameStates[gameId];
        require(state.curPlayerIndex == 0, "wrong player index to start shuffle");
        state.state = BaseState.Shuffle;
        nextToCall[gameId] = next;
        emit PlayerTurn(gameId, state.curPlayerIndex, BaseState.Shuffle);
    }

    /**
     * [SDK]: shuffle, called by each player 
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
        // end shuffle state and execute call back
        // if this is the last player to shuffle
        if (state.curPlayerIndex == state.playerAddrs.length) {
            state.curPlayerIndex = 0;
            _callGameContract(gameId);
        } else {
            emit PlayerTurn(gameId, state.curPlayerIndex, BaseState.Shuffle);
        }
    }

    /**
     * [Game Contract]: can only called by game contract,
     * specifiy a set of cards to be dealed to a players
     */
    function dealCardsTo(
        uint256 gameId,
        BitMaps.BitMap256 memory cards,
        uint256 playerId,
        bytes calldata next
    ) external override gameOwner(gameId) {
        ShuffleGameState storage state = gameStates[gameId];
        // TODO: maybe add a checking of the remaining deck size
        // this check could removed if we formally verified the contract
        require(state.curPlayerIndex == 0, "internal erorr! ");
        require(
            playerId < gameInfos[gameId].numPlayers,
            "game contract error: deal card to an invalid player id"
        );

        // change to Play state if not already in the state
        if (state.state != BaseState.Deal) {
            state.state = BaseState.Deal;
        }
        state.deck.cardsToDeal = cards;
        state.deck.playerToDeal = playerId;

        // we assume a game must have at least 2 or more players,
        // otherwise the game should stop
        if (playerId == 0) {
            state.curPlayerIndex = 1;
        }
        nextToCall[gameId] = next;
        emit PlayerTurn(gameId, state.curPlayerIndex, BaseState.Deal);
    }

    /**
     * [SDK]: deal (draw) card from each player
     */
    function playerDealCards(
        uint256 gameId,
        uint[8][] memory proofs,
        Card[] memory decryptedCards,
        uint256[2][] memory initDeltas
    ) external checkState(gameId, BaseState.Deal) checkTurn(gameId) {
        ShuffleGameInfo memory info = gameInfos[gameId];
        ShuffleGameState storage state = gameStates[gameId];
        uint256 numberCardsToDeal = BitMaps.memberCountUpTo(
            state.deck.cardsToDeal,
            info.numCards
        );
        require(
            proofs.length == numberCardsToDeal,
            "number of proofs is wrong!"
        );
        require(
            decryptedCards.length == numberCardsToDeal,
            "number of decrypted cards is wrong!"
        );
        require(
            initDeltas.length == numberCardsToDeal,
            "init delta's shape is invalid!"
        );
        uint256 counter = 0;
        for (uint256 cid = 0; cid < uint256(info.numCards); cid++) {
            if (BitMaps.get(state.deck.cardsToDeal, cid)) {
                // update decrypted card
                _updateDecryptedCard(
                    gameId,
                    cid,
                    proofs[counter],
                    decryptedCards[counter],
                    initDeltas[counter]
                );
                counter++;
            }
        }
        state.curPlayerIndex++;
        if (state.curPlayerIndex == state.deck.playerToDeal) {
            state.curPlayerIndex++;
        }

        if (state.curPlayerIndex == info.numPlayers) {
            state.curPlayerIndex = 0;
            state.playerHand[state.deck.playerToDeal] ++;
            _callGameContract(gameId);
        } else {
            emit PlayerTurn(gameId, state.curPlayerIndex, BaseState.Deal);
        }
    }

    /**
     * [Internal]: update a decrypted card.
     */
    function _updateDecryptedCard(
        uint256 gameId,
        uint256 cardIndex,
        uint[8] memory proof,
        Card memory decryptedCard,
        uint256[2] memory initDelta
    ) internal {
        ShuffleGameState storage state = gameStates[gameId];
        require(
            !BitMaps.get(state.deck.decryptRecord[cardIndex], state.curPlayerIndex),
            "This player has decrypted this card already"
        );

        // recover Y0 and Y1 from the current X0 and X1
        if (state.deck.decryptRecord[cardIndex]._data == 0) {
            state.deck.Y0[cardIndex] = CurveBabyJubJub.recoverY(
                state.deck.X0[cardIndex],
                initDelta[0],
                BitMaps.get(state.deck.selector0, cardIndex)
            );
            state.deck.Y1[cardIndex] = CurveBabyJubJub.recoverY(
                state.deck.X1[cardIndex],
                initDelta[1],
                BitMaps.get(state.deck.selector1, cardIndex)
            );
        }

        decryptVerifier.verifyProof(
            [proof[0], proof[1]],
            [[proof[2], proof[3]], [proof[4], proof[5]]],
            [proof[6], proof[7]],
            [
                decryptedCard.X,
                decryptedCard.Y,
                state.deck.X0[cardIndex],
                state.deck.Y0[cardIndex],
                state.deck.X1[cardIndex],
                state.deck.Y1[cardIndex],
                state.playerPkX[state.curPlayerIndex],
                state.playerPKY[state.curPlayerIndex]
            ]
        );
        // update X1 and Y1 in the deck
        state.deck.X1[cardIndex] = decryptedCard.X;
        state.deck.Y1[cardIndex] = decryptedCard.Y;
        BitMaps.set(state.deck.decryptRecord[cardIndex], state.curPlayerIndex);
    }

    // [Game Contract]: specify a player to open a number of cards
    function openCards(
        uint256 gameId,
        uint256 playerId,
        uint8 openningNum,
        bytes calldata next
    ) external override gameOwner(gameId) {
        ShuffleGameState storage state = gameStates[gameId];
        require(openningNum <= state.playerHand[playerId], "don't have enough card to open");
        state.openning = openningNum;
        state.curPlayerIndex = playerId;
        nextToCall[gameId] = next;
        state.state = BaseState.Open;
        emit PlayerTurn(gameId, playerId, BaseState.Open);
    }

    // [SDK]: player open one or more cards
    function playerOpenCards(
        uint256 gameId,
        BitMaps.BitMap256 memory cards,     // TODO : should be inner shuffleManager
        uint[8][] memory proofs,
        Card[] memory decryptedCards
    ) external checkState(gameId, BaseState.Open) checkTurn(gameId) {
        ShuffleGameInfo memory info = gameInfos[gameId];
        ShuffleGameState storage state = gameStates[gameId];
        uint256 numberCardsToOpen = BitMaps.memberCountUpTo(
            state.deck.cardsToDeal,
            info.numCards
        );
        require(numberCardsToOpen == state.openning, "cards passed by player doesn't match number to open");
        require(
            proofs.length == numberCardsToOpen,
            "number of proofs is wrong!"
        );
        require(
            decryptedCards.length == numberCardsToOpen,
            "number of decrypted cards is wrong!"
        );
        uint[2] memory dummy = [uint(0), uint(0)];
        uint256 counter = 0;
        for (uint256 cid = 0; cid < uint256(info.numCards); cid++) {
            if (BitMaps.get(cards, cid)) {
                // update decrypted card
                _updateDecryptedCard(
                    gameId,
                    cid,
                    proofs[counter],
                    decryptedCards[counter],
                    dummy
                );
                counter++;
            }
        }
        // reset the openning register
        state.openning = 0;
        // update players handcard status
        state.playerHand[state.curPlayerIndex] --;
        // call the next action
        _callGameContract(gameId);
    }

    // [Game Contract]: end game
    function endGame(
        uint256 gameId
    ) external override gameOwner(gameId) {
        ShuffleGameState storage state = gameStates[gameId];
        state.state = BaseState.Complete;
        for (uint256 playerId = 0; playerId < gameInfos[gameId].numCards; playerId++) {
            emit PlayerTurn(gameId, playerId, BaseState.Complete);
        }
    }

    // goes into error state
    function error(uint256 gameId, bytes calldata next)
        external override
        gameOwner(gameId)
    {
        gameStates[gameId].state = BaseState.GameError;
        nextToCall[gameId] = next;
        _callGameContract(gameId);
    }

    // switch control to game contract, set the game to error state if the contract call failed
    function _callGameContract(uint256 gameId) internal {
        (bool success, bytes memory data) = _activeGames[gameId].call(
            nextToCall[gameId]
        );
        if (!success) {
            emit GameContractCallError(_activeGames[gameId], data);
            gameStates[gameId].state = BaseState.GameError;
        }
    }

}
