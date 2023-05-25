// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "../shuffle/IBaseGame.sol";
import "../shuffle/IShuffleStateManager.sol";
import "hardhat/console.sol";

struct HSCard {
    uint256 attack;
    uint256 defense;
}

struct Game {
    address[2] players;
    uint256[2] health;
    uint256[2] shield;
    uint256[2] shuffleIds;
    uint256 curPlayerIndex;
    // cache for creator pk
    uint256 pkX;
    uint256 pkY;
}

contract HearthStone is IBaseGame {
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
        return DeckConfig.Deck30Card;
    }

    uint256 public largestHSId;

    // a mappping between Hilo Id and game info
    mapping(uint256 => Game) gameInfos;

    event CreateGame(uint256 indexed hsId, uint256 shuffleId, address creator);
    event JoinGame(uint256 indexed hsId, uint256 shuffleId, address joiner);
    event DealEnd(uint256 indexed hsId, address player, uint256 playerIdx);
    event ChooseCard(
        uint256 indexed hsId,
        address player,
        uint256 playerIdx,
        uint256 cardIdx
    );
    event OpenCard(
        uint256 indexed hsId,
        address player,
        uint256 playerIdx,
        uint256 cardIdx,
        uint256 cardValue
    );
    event NextPlayer(uint256 indexed hsId, address player, uint256 playerIdx);
    event EndGame(uint256 indexed hsId, address player, uint256 playerIdx);

    constructor(IShuffleStateManager _shuffle) {
        shuffle = _shuffle;
        largestHSId = 100;
    }

    // create a new game by a player
    // creator should be player 0 in shuffle1 and player 1 in shuffle2
    function createShuffleForCreator(uint256 pkX, uint256 pkY) external {
        ++largestHSId;

        gameInfos[largestHSId].players[0] = msg.sender;
        gameInfos[largestHSId].health[0] = 30;
        gameInfos[largestHSId].shuffleIds[0] = shuffle.createShuffleGame(2);
        gameInfos[largestHSId].pkX = pkX;
        gameInfos[largestHSId].pkY = pkY;

        bytes memory next = abi.encodeWithSelector(
            this.moveToShuffleStage.selector,
            largestHSId,
            gameInfos[largestHSId].shuffleIds[0],
            0
        );
        shuffle.register(gameInfos[largestHSId].shuffleIds[0], next);
        shuffle.playerRegister(
            gameInfos[largestHSId].shuffleIds[0],
            msg.sender,
            pkX,
            pkY
        );

        emit CreateGame(
            largestHSId,
            gameInfos[largestHSId].shuffleIds[0],
            msg.sender
        );
    }

    // create a new game by a player
    // creator should be player 0 in shuffle1 and player 1 in shuffle2
    function createShuffleForJoiner(
        uint256 hsId,
        uint256 pkX,
        uint256 pkY
    ) external {
        require(
            gameInfos[hsId].players[0] != address(0) &&
                gameInfos[hsId].players[1] == address(0),
            "invalid ks id"
        );

        gameInfos[hsId].players[1] = msg.sender;
        gameInfos[hsId].health[1] = 30;
        gameInfos[hsId].shield[1] = 10;
        gameInfos[hsId].shuffleIds[1] = shuffle.createShuffleGame(2);

        bytes memory next = abi.encodeWithSelector(
            this.moveToShuffleStage.selector,
            hsId,
            gameInfos[hsId].shuffleIds[1],
            1
        );
        shuffle.register(gameInfos[hsId].shuffleIds[1], next);

        shuffle.playerRegister(
            gameInfos[hsId].shuffleIds[0],
            msg.sender,
            pkX,
            pkY
        );
        shuffle.playerRegister(
            gameInfos[hsId].shuffleIds[1],
            msg.sender,
            pkX,
            pkY
        );
        shuffle.playerRegister(
            gameInfos[hsId].shuffleIds[1],
            gameInfos[hsId].players[0],
            gameInfos[hsId].pkX,
            gameInfos[hsId].pkY
        );
        delete gameInfos[hsId].pkX;
        delete gameInfos[hsId].pkY;

        emit JoinGame(largestHSId, gameInfos[hsId].shuffleIds[1], msg.sender);
    }

    // Allow players to shuffle the deck, and specify the next state:
    // dealCard0ToPlayer0
    function moveToShuffleStage(
        uint256 hsId,
        uint256 shuffleId,
        uint256 playerIdx
    ) external onlyShuffleManager {
        bytes memory next = abi.encodeWithSelector(
            this.dealCardsToPlayer.selector,
            hsId,
            shuffleId,
            playerIdx
        );
        shuffle.shuffle(shuffleId, next);
    }

    function dealCardsToPlayer(
        uint256 hsId,
        uint256 shuffleId,
        uint256 playerIdx
    ) external onlyShuffleManager {
        BitMaps.BitMap256 memory cards;
        cards._data = 1023; // ...1111111111
        bytes memory next = abi.encodeWithSelector(
            this.moveToChooseStage.selector,
            hsId,
            playerIdx
        );
        shuffle.dealCardsTo(shuffleId, cards, 0, next);
    }

    function moveToChooseStage(
        uint256 hsId,
        uint256 playerIdx
    ) external onlyShuffleManager {
        emit DealEnd(hsId, gameInfos[hsId].players[playerIdx], playerIdx);
    }

    // choose which card to show at this round, shuffleIdx means player's deck
    function chooseCard(
        uint256 hsId,
        uint256 playerIdx,
        uint256 cardIdx
    ) external {
        require(
            msg.sender == gameInfos[hsId].players[playerIdx],
            "invalid player index"
        );
        require(
            playerIdx == gameInfos[hsId].curPlayerIndex,
            "not in your turn"
        );

        bytes memory next = abi.encodeWithSelector(
            this.settle.selector,
            hsId,
            playerIdx,
            cardIdx
        );
        shuffle.openCards(gameInfos[hsId].shuffleIds[playerIdx], 0, 1, next);

        emit ChooseCard(hsId, msg.sender, playerIdx, cardIdx);
    }

    function settle(
        uint256 hsId,
        uint256 playerIdx,
        uint256 cardIdx
    ) external onlyShuffleManager {
        uint256 cardValue = shuffle.queryCardValue(
            gameInfos[hsId].shuffleIds[playerIdx],
            cardIdx
        );
        require(cardValue != shuffle.INVALID_INDEX(), "invalid card value");

        emit OpenCard(
            hsId,
            gameInfos[hsId].players[playerIdx],
            playerIdx,
            cardIdx,
            cardValue
        );

        battle(hsId, playerIdx, cardValue);
    }

    function battle(
        uint256 hsId,
        uint256 playerIdx,
        uint256 cardValue
    ) internal {
        HSCard memory card = getCardConfig(cardValue);

        // add defense to player health
        gameInfos[hsId].shield[playerIdx] = card.defense;

        // player loses when health <= 0
        if (
            gameInfos[hsId].health[1 - playerIdx] +
                gameInfos[hsId].shield[1 - playerIdx] >
            card.attack
        ) {
            if (gameInfos[hsId].shield[1 - playerIdx] >= card.attack) {
                gameInfos[hsId].shield[1 - playerIdx] -= card.attack;
            } else {
                gameInfos[hsId].health[1 - playerIdx] -=
                    card.attack -
                    gameInfos[hsId].shield[1 - playerIdx];
                gameInfos[hsId].shield[1 - playerIdx] = 0;
            }
            gameInfos[hsId].curPlayerIndex++;
            if (gameInfos[hsId].curPlayerIndex == 2) {
                gameInfos[hsId].curPlayerIndex = 0;
            }
            emit NextPlayer(
                hsId,
                gameInfos[hsId].players[gameInfos[hsId].curPlayerIndex],
                gameInfos[hsId].curPlayerIndex
            );
        } else {
            gameInfos[hsId].health[1 - playerIdx] = 0;
            emit EndGame(hsId, gameInfos[hsId].players[playerIdx], playerIdx);
            shuffle.endGame(gameInfos[hsId].shuffleIds[playerIdx]);
        }
    }

    function getGameInfo(uint256 hsId) external view returns (Game memory) {
        return gameInfos[hsId];
    }

    function getCardConfig(
        uint256 cardValue
    ) internal pure returns (HSCard memory card) {
        // 0: Wizard
        // 1: Warrior
        // 2: Tank
        uint256 cardType = cardValue / 10;

        if (cardType == 0) {
            card.attack = 16;
            card.defense = 5;
        }
        if (cardType == 1) {
            card.attack = 11;
            card.defense = 10;
        }
        if (cardType == 2) {
            card.attack = 3;
            card.defense = 18;
        }
    }
}
