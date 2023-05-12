// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "../shuffle/IBaseGame.sol";
import "../shuffle/IShuffleStateManager.sol";
import "hardhat/console.sol";
// An example game contract using zkShuffle
// Hilo is a simple two-player game on 5 card deck
// 1. deal the first card to player 0
// 2. deal the second card to player 1
// 3. (Offchain) player guess who's card is bigger
// 4. Open player 0's card
// 5. Open player 1's card
// So the game dev only need to specify the game state machine:
// - create a new game by calling ShuffleManager store the `gameID`
//   from ShuffleManager
// - define the game state machine by specifying the next state in the `next`
//   calldata so that ShuffleManager will call back

enum Selection {
    UnGuessed,
    High,
    Low
}

struct Game {
    Selection[2] selections;
    uint256 shuffleGameId;
}

contract HiloGame is IBaseGame {
    uint256 public constant INVALID_INDEX = 999999;

    IShuffleStateManager public shuffle;

    // check whether the caller is the shuffle Manager
    modifier onlyShuffleManager() {
        require(
            address(shuffle) == msg.sender,
            "Caller is not shuffle manager."
        );
        _;
    }

    function cardConfig() external pure override returns (DeckConfig) {
        return DeckConfig.Deck52Card;
    }

    uint256 public largestHiloId;

    // a mappping between Hilo Id and game info
    mapping(uint256 => Game) gameInfos;

    event CreateGame(
        uint256 indexed hiloId,
        uint256 shuffleGameId,
        address creator
    );
    event Guess(
        uint256 indexed hiloId,
        uint256 playerIdx,
        address player,
        Selection selection
    );
    event EndGame(
        uint256 indexed hiloId,
        uint256 playerIdx,
        address player,
        bool result
    );

    constructor(IShuffleStateManager _shuffle) {
        shuffle = _shuffle;
        largestHiloId = 100;
    }

    // Alice.hilo.createGame -> shuffle.register
    // Alice.shuffle.playerRegister
    // Bob.shuffle.playerRegister -> hilo.moveToShuffleStage -> shuffle.shuffle
    // Alice.shuffle.playerShuffle
    // Bob.shuffle.playerShuffle -> hilo.dealCard0ToPlayer0 -> shuffle.dealCard(0)
    // Alice.shuffle.playerDealCard -> hilo.dealCardToPlayer1 -> shuffle.dealCard(1)
    // Bob.shuffle.playerDealCard -> hilo.openCard0 -> shuffle.openCard(0)

    // create a new game by a player
    function createGame() external {
        ++largestHiloId;

        uint256 shuffleGameId = shuffle.createShuffleGame(2);
        gameInfos[largestHiloId].shuffleGameId = shuffleGameId;

        bytes memory next = abi.encodeWithSelector(
            this.moveToShuffleStage.selector,
            largestHiloId
        );
        shuffle.register(shuffleGameId, next);

        emit CreateGame(largestHiloId, shuffleGameId, msg.sender);
    }

    // Allow players to shuffle the deck, and specify the next state:
    // dealCard0ToPlayer0
    function moveToShuffleStage(uint256 hiloId) external onlyShuffleManager {
        bytes memory next = abi.encodeWithSelector(
            this.dealCard0ToPlayer0.selector,
            hiloId
        );
        shuffle.shuffle(gameInfos[hiloId].shuffleGameId, next);
    }

    // Deal the 0th card to player 0 and specify the next state:
    // dealCard1ToPlayer1
    function dealCard0ToPlayer0(uint256 hiloId) external onlyShuffleManager {
        BitMaps.BitMap256 memory cards;
        cards._data = 1; // ...0001
        bytes memory next = abi.encodeWithSelector(
            this.dealCard1ToPlayer1.selector,
            hiloId
        );
        shuffle.dealCardsTo(gameInfos[hiloId].shuffleGameId, cards, 0, next);
    }

    // Deal the 1st card to player 1 and specify the next state:
    // openCard0
    function dealCard1ToPlayer1(uint256 hiloId) external onlyShuffleManager {
        BitMaps.BitMap256 memory cards;
        cards._data = 2; // ...0010
        bytes memory next = abi.encodeWithSelector(
            this.openCard0.selector,
            hiloId
        );
        shuffle.dealCardsTo(gameInfos[hiloId].shuffleGameId, cards, 1, next);
    }

    function guess(uint256 hiloId, Selection selection) external {
        uint256 playerIdx = shuffle.getPlayerIdx(
            gameInfos[hiloId].shuffleGameId,
            msg.sender
        );
        require(playerIdx != shuffle.INVALID_INDEX());

        require(selection != Selection.UnGuessed);
        require(
            gameInfos[hiloId].selections[playerIdx] == Selection.UnGuessed,
            "player already guessed"
        );

        gameInfos[hiloId].selections[playerIdx] = selection;

        emit Guess(hiloId, playerIdx, msg.sender, selection);
    }

    // Open Card 0 and specify the next state:
    // openCard1
    function openCard0(uint256 hiloId) external onlyShuffleManager {
        bytes memory next = abi.encodeWithSelector(
            this.openCard1.selector,
            hiloId
        );
        shuffle.openCards(gameInfos[hiloId].shuffleGameId, 0, 1, next);
    }

    // Open the Card 1 and specify the next state:
    // openCard1
    function openCard1(uint256 hiloId) external onlyShuffleManager {
        bytes memory next = abi.encodeWithSelector(
            this.endGame.selector,
            hiloId
        );
        shuffle.openCards(gameInfos[hiloId].shuffleGameId, 1, 1, next);
    }

    // End the game, GG!
    function endGame(uint256 hiloId) external onlyShuffleManager {
        // game-specific cleanup
        shuffle.endGame(gameInfos[hiloId].shuffleGameId);
    }

    function isPlayerGuessed(
        uint256 hiloId,
        uint256 playerIdx
    ) external view returns (bool) {
        require(playerIdx == 0 || playerIdx == 1, "invalid player");

        return gameInfos[hiloId].selections[playerIdx] != Selection.UnGuessed;
    }

    function isGuessRight(
        uint256 hiloId,
        uint256 playerIdx
    ) public view returns (bool) {
        require(playerIdx == 0 || playerIdx == 1, "invalid player");

        uint256 selfValue = shuffle.queryCardValue(
            gameInfos[hiloId].shuffleGameId,
            playerIdx
        );
        uint256 opponentValue = shuffle.queryCardValue(
            gameInfos[hiloId].shuffleGameId,
            1 - playerIdx
        );
        if (gameInfos[hiloId].selections[playerIdx] == Selection.High) {
            return selfValue > opponentValue;
        }
        if (gameInfos[hiloId].selections[playerIdx] == Selection.Low) {
            return selfValue < opponentValue;
        }
        revert("invalid selection");
    }
}
