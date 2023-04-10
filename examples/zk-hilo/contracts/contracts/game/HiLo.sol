// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IHiLo.sol";
import "../shuffle/IShuffle.sol";

// Player who creates the game decides the game role
enum GameRole {
    Dealer,
    Player
}

enum HiOrLo {
    Hi,
    Lo
}
struct Game {
    uint256 gameId;
    address dealer;
    address player;
    uint playerIndex;
    uint dealerIndex;
    bool playerPlacedBet;
    bool dealerPlacedBet;
    uint256 dealerCard;
    uint256 playerCard;
    bool dealerRegistered;
    bool playerRegistered;
    bool playerGuessed;
    bool dealerCardRevealed;
    bool playerCardRevealed;
    uint256 bet;
    HiOrLo guess;
}

// The main game logic contract
contract HiLo is Ownable, IHiLo {
    // ZK shuffle contract
    IShuffle public shuffle;

    uint256 public largestGameId;
    mapping(uint256 => address) public admins;
    mapping(uint256 => Game) public games;
    address payable public owner;

    constructor(address shuffle_) {
        setShuffle(shuffle_);
        largestGameId = 0;
        owner = payable(msg.sender);
    }

    // Sets shuffle contract.
    function setShuffle(address shuffle_) public onlyOwner {
        require(shuffle_ != address(0), "empty address");
        shuffle = IShuffle(shuffle_);
    }

    receive() external payable {}

    function withdraw() external onlyOwner {
        owner.transfer(address(this).balance);
    }

    // User1 creates a game, and becomes the admin of the game.
    function createGame(GameRole role, uint256 bet) external {
        uint256 gameId = largestGameId++;
        //set the admins of the game
        admins[gameId] = msg.sender;
        //set the game
        Game memory game;
        game.gameId = gameId;
        //set the role of User1 who creates the game
        if (role == GameRole.Dealer) {
            game.dealer = msg.sender;
        } else if (role == GameRole.Player) {
            game.player = msg.sender;
        } else {
            revert("invalid role");
        }
        //set the bet of the game
        game.bet = bet;
        dealerPlacedBet = false;
        playerPlacedBet = false;
        dealerIndex = 0;
        playerIndex = 1;
        games[gameId] = game;
        return gameId;
        emit GameCreated(msg.sender, gameId);
        shuffle.setGameSettings(2, gameId);
    }

    //User2 joins the game
    function joinGame(uint256 gameId) external {
        Game memory game = games[gameId];
        require(game.gameId != 0, "invalid gameId");
        require(
            msg.sender != game.dealer && msg.sender != game.player,
            "already joined"
        );
        require(
            game.player == address(0) || game.dealer == address(0),
            "game is full"
        );

        // Assign the unselected role to User2
        if (game.dealer == address(0)) {
            game.dealer = msg.sender;
        } else {
            game.player = msg.sender;
        }
        // Emit an event to indicate that User2 has joined the game
        emit GameJoined(msg.sender, gameId);
    }

    function placeBet(uint256 gameId) external payable {
        Game memory game = games[gameId];
        require(game.gameId != 0, "invalid gameId");
        require(
            msg.sender == game.dealer || msg.sender == game.player,
            "not a player in this game"
        );
        require(msg.value == bet, "invalid bet");
        require(
            (msg.sender == game.dealer && !game.dealerPlacedBet) ||
                (msg.sender == game.player && !game.playerPlacedBet),
            "already placed bet"
        );
        if (msg.sender == game.dealer) {
            game.dealerPlacedBet = true;
        } else {
            game.playerPlacedBet = true;
        }
        //transfer the bet to the contract
        address(this).transfer(msg.value);

        emit BetPlaced(msg.sender, gameId);
    }

    function registerPlayer(uint256[2] calldata pk, uint256 gameId) external {
        //register both players if bet placed
        Game memory game = games[gameId];
        require(game.gameId != 0, "invalid gameId");
        require(
            msg.sender == game.dealer || msg.sender == game.player,
            "not a player in this game"
        );
        require(game.dealerPlacedBet && game.playerPlacedBet, "bet not placed");
        //register player
        shuffle.register(msg.sender, pk, gameId);
        if (msg.sender == game.dealer) {
            game.dealerRegistered = true;
        } else {
            game.playerRegistered = true;
        }
        emit PlayerRegistered(msg.sender, gameId);
    }

    function shuffleDeck(
        uint256[8] memory proof,
        uint256 nonce,
        uint256[52] calldata shuffledX0,
        uint256[52] calldata shuffledX1,
        uint256[2] calldata selector,
        uint256 gameId
    ) external checkPlayerExist(gameId) {
        address permanentAccount = msg.sender;
        shuffle.shuffle(
            permanentAccount,
            proof,
            nonce,
            shuffledX0,
            shuffledX1,
            selector,
            gameId
        );
        emit DeckShuffled(permanentAccount, gameId);
    }

    function deal(
        uint256[] calldata cardIdx,
        uint256[8][] calldata proof,
        uint256[2][] memory decryptedCard,
        uint256[2][] memory initDelta,
        uint256 gameId,
        bool shouldVerifyDeal
    ) external checkPlayerExist(gameId) {
        require(
            cardIdx.length > 0 &&
                proof.length == cardIdx.length &&
                decryptedCard.length == cardIdx.length &&
                initDelta.length == cardIdx.length
        );
        address permanentAccount = accountManagement.getPermanentAccount(
            msg.sender
        );

        //get player index, 0 for dealer, 1 for player, 0 cardIdx for dealer, 1 cardIdx for player
        if (msg.sender == games[gameId].dealer) {
            playerIdx = 0;
            idx = 0;
        } else {
            playerIdx = 1;
            idx = 1;
        }

        shuffle.deal(
            permanentAccount,
            cardIdx[idx], //if dealer, cardIdx[0], if player, cardIdx[1]
            playerIdx,
            proof[i],
            decryptedCard[i],
            initDelta[i],
            gameId,
            shouldVerifyDeal
        );

        emit BatchDecryptProofProvided(
            permanentAccount,
            cardIdx.length,
            gameId
        );
    }

    //get card value for one card in hand, customized for HiLo game specifically
    function getCardValue(
        uint256 gameId,
        uint256 playerIdx
    ) internal view returns (uint256) {
        uint256 actualCardValue = shuffle.search(
            games[gameId].handCards[playerIdx][0],
            gameId
        );
        require(
            actualCardValue != shuffle.INVALID_CARD_INDEX(),
            "invalid card, something is wrong"
        );
        return actualCardValue;
    }

    function revealDealerCard(uint256 gameId) external {
        // Check that the game is in progress and the dealer card has not been revealed
        Game memory game = games[gameId];
        require(game.gameId != 0, "invalid gameId");
        // Check that the player calling the function is the dealer
        require(
            msg.sender == game.dealer,
            "Only the dealer can reveal their card"
        );
        // Check that the player did not guess the dealer's card
        require(!game.playerGuessed, "Dealer's card has already been guessed");

        // Check both dealercard and playercard are not revealed
        require(
            !game.dealerCardRevealed && !game.playerCardRevealed,
            "Dealer's card has already been revealed"
        );

        // Get the value of the dealer's card using the getCardValue() function
        uint256 dealerCardValue = getCardValue(gameId, game.dealerIndex);

        // Update the internal state of the game to indicate that the dealer's card has been revealed
        game.dealerCard = dealerCardValue;

        // Emit an event to notify external listeners that the dealer's card has been revealed
        emit DealerCardRevealed(gameId, dealerCardValue);
        game.dealerCardRevealed = true;
    }

    function playerGuessHiLo(HiOrLo guess, uint256 gameId) external {
        Game memory game = games[gameId];
        require(game.gameId != 0, "invalid gameId");
        require(
            msg.sender == game.player,
            "Only the player can guess the dealer's card"
        );
        require(!game.playerGuessed, "Player has already guessed");
        require(
            game.dealerCardRevealed && !game.playerCardRevealed,
            "Dealer's card has not been revealed"
        );

        game.guess = guess;
        game.playerGuessed = true;
    }

    function revealPlayerCard(uint256 gameId) external {
        Game memory game = games[gameId];
        require(game.gameId != 0, "invalid gameId");
        require(
            msg.sender == game.player,
            "Only the player can reveal their card"
        );
        require(
            game.dealerCardRevealed && !game.playerCardRevealed,
            "Dealer's card has not been revealed"
        );
        require(game.playerGuessed, "Player has not guessed");

        uint256 playerCardValue = getCardValue(gameId, game.playerIndex);

        emit PlayerCardRevealed(gameId, playerCardValue);
        game.playerCard = playerCardValue;
        game.playerCardRevealed = true;
    }

    function evalutate(uint256 gameId) public payable returns (bool) {
        Game memory game = games[gameId];
        require(game.gameId != 0, "invalid gameId");
        require(
            game.dealerCard >= 0 && game.dealerCard <= 51,
            "Invalid first card"
        );
        require(
            game.playerCard >= 0 && game.playerCard <= 51,
            "Invalid second card"
        );

        uint dealerCardRank = game.dealerCard / 4;
        uint playerCardRank = playerCard / 4;

        // determine which card is higher or lower based on the player's guess
        bool win = false;
        if (keccak256(bytes(string(guess))) == keccak256(bytes("higher"))) {
            win = dealerCardRank < playerCardRank;
        } else if (
            keccak256(bytes(string(guess))) == keccak256(bytes("lower"))
        ) {
            win = dealerCardRank > playerCardRank;
        }
        // if the player wins, transfer the bet amount to the player
        if (win) {
            payable(game.player).transfer(bet * 2);
            emit GameResult(game.player, "player won", bet * 2); // emit the game result event
        } else {
            // if the player loses, transfer the bet amount to the dealer
            payable(game.dealer).transfer(bet * 2);
            emit GameResult(game.dealer, "dealer won", bet * 2); // emit the game result event
        }

        return win;
    }
}
