// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
pragma experimental ABIEncoderV2;

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
    DealingCard
}

// Card Information
struct CardInfo {
    uint256 numCards;
    address encryptVerifier;
}

interface IShuffle {
    // A constant indicating the card is not found in the deck
    function INVALID_CARD_INDEX() external view returns (uint256);

    // Set the game settings of the game of `gameId`
    function setGameSettings(uint256 numPlayers_, uint256 gameId) external;

    // Registers a player with the `permanentAccount`, public key `pk`, and `gameId`.
    function register(
        address permanentAccount,
        uint256[2] memory pk,
        uint256 gameId,
        uint256 numCards
    ) external;

    // Returns the aggregated public key for all players.
    function queryAggregatedPk(
        uint256 gameId
    ) external view returns (uint256[2] memory);

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

    // Shuffles the deck for `permanentAccount`.
    function shuffle(
        address permanentAccount,
        uint256[8] memory proof,
        uint256[] memory shuffledX0,
        uint256[] memory shuffledX1,
        uint256[2] memory selector,
        uint256 gameId
    ) external;

    // Deals the `cardIdx`-th card given the zk `proof` of validity and `out` for decrypted card from `curPlayerIdx`.
    //  `initDelta` is used when `curPlayerIdx` is the first one to decrypt `cardIdx`-th card due to the compressed
    //  representation of elliptic curve points.
    function deal(
        address permanentAccount,
        uint256 cardIdx,
        uint256 curPlayerIdx,
        uint256[8] memory proof,
        uint256[2] memory decryptedCard,
        uint256[2] memory initDelta,
        uint256 gameId
    ) external;

    // Searches the value of the `cardIndex`-th card in the `gameId`-th game.
    function search(
        uint256 cardIndex,
        uint256 gameId
    ) external view returns (uint256);
}
