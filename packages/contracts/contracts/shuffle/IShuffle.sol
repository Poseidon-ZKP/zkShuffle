// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IShuffleEncryptVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory input
    ) external view;
}

interface IDecryptVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[8] memory input
    ) external view;
}

// Deck of cards
//
// Suppose that we have n cards in the deck, for each card,
// we have two points on BabyJubJub (x_{i,0}, y_{i,0}), 
// (x_{i,1}, y_{i,1}). We use a compressed representation of these points 
// (x_{i,0}, c_{i, 0}), (x_{i,1}, c_{i, 1}), where c_{i, j} is a 
// boolean flag to represent the sign instead of a y coordinate.
// 
// We compress the selector to a bitmap and packed the bitmap into two uint256, 
// which means the deck can at most support 253 cards.
struct Deck {
    // x0 of cards
    uint256[] X0;
    // x1 of cards
    uint256[] X1;
    // 2 selectors for recovering y coordinates
    uint256[2] Selector;
}

// Card as two baby jubjub curve points
struct Card {
    uint256 X0;
    uint256 Y0;
    uint256 X1;
    uint256 Y1;
}

// Cards in dealing
struct CardDeal {
    mapping(uint256 => Card) cards;
    // Record which player has decrypted individual cards
    // Warning: Support at most 256 players
    mapping(uint256 => uint256) record;
}

// Player information
struct PlayerInfo {
    // Address of each player. Length should match `numPlayer`.
    address[] playerAddr;
    // Public key of each player
    uint256[] playerPk;
    // An aggregated public key for all players
    uint256[2] aggregatedPk;
    // Nonce
    uint256 nonce;
}

// State of the game
enum State {
    Registration,
    ShufflingDeck,
    DealingCard,
    Error,
    Complete
}

// Card Information
struct CardInfo {
    uint256 numCards;
    address encryptVerifier;
}

interface IShuffle {
    // Creates a game.
    function createGame(
        uint256 numPlayers_,
        uint256 numCards_
    ) external returns (uint256);

    // Returns the aggregated public key for all players.
    function queryAggregatedPk(
        uint256 gameId
    ) external view returns (uint256[2] memory);

    function gameCardNum(uint gameId) external view returns(uint);
    function gamePlayerIdx(uint gameId) external view returns(uint);
    function gameStatus(uint gameId) external view returns(uint);
    function gameCardDealRecord(uint gameId, uint cardIdx) external view returns(uint);

    // Shuffles the deck for `permanentAccount`.
    function shuffle(
        address account,
        uint256[8] memory proof,
        Deck memory deck,
        uint256 gameId
    ) external;

    function draw(
        uint gameId,
        address account,
        uint playerIndex,
        uint[] memory cardIndex,
        uint[8][] memory proof,
        uint[2][] memory decryptedCard,
        uint[2][] memory initDelta
    ) external;

    function openCard(
        uint256 gameId, 
        address account,
        uint playerIndex,
        uint256[] memory cardIndex,
        uint256[8][] memory proof,
        uint256[2][] memory decryptedCard
    ) external;

    event Register(
        uint256 indexed gameId,
        uint256 playerId,
        address playerAddr
    );

    // A constant indicating the card is not found in the deck
    function INVALID_CARD_INDEX() external view returns (uint256);

    // Registers a player with the `permanentAccount`, public key `pk`, and `gameId`.
    function register(
        address permanentAccount,
        uint256[2] memory pk,
        uint256 gameId
    ) external returns (uint);

    // Queries deck.
    function queryDeck(uint256 gameId) external view returns (Deck memory);

    // Queries the `index`-th card from the deck.
    function queryCardFromDeck(
        uint256 index,
        uint256 gameId
    ) external view returns (uint256[4] memory card);

    // Queries the `index`-th card in deal.
    function queryCardInDeal(
        uint256 index,
        uint256 gameId
    ) external view returns (uint256[4] memory card);

    // Searches the value of the `cardIndex`-th card in the `gameId`-th game.
    function search(
        uint256 cardIndex,
        uint256 gameId
    ) external view returns (uint256);

}
