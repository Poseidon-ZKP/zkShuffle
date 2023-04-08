// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
pragma experimental ABIEncoderV2;

interface IShuffleEncryptVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[215] memory input
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
    // x0 of 52 cards
    uint256[52] X0;
    // x1 of 52 cards
    uint256[52] X1;
    // 2 selectors for recovering y coordinates
    uint256[2] Selector;
    // proof
    uint256[8] Proof;
    // timestamp when receiving X0, X1, and Selector
    uint256 timestamp;
}

// Cards in dealing assuming at most 9 players.
struct CardDeal {
    uint256[52] X0;
    uint256[52] Y0;
    uint256[10][52] X1;
    uint256[10][52] Y1;
    uint256[8][9][52] proof;
    uint256[9][52] prevPlayerIdx;
    // Record which player has decrypted individual cards
    // Warning: Support at most 256 players
    uint256[52] record;
    // Index of the last player who dealed a card
    uint256[52] curPlayerIdx;
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

interface IShuffle {
    // A constant indicating the card is not found in the deck
    function INVALID_CARD_INDEX() external view returns (uint256);

    // A constant indicating the player is not found in the deck
    function UNREACHABLE_PLAYER_INDEX() external view returns (uint256);

    // Set the game settings of the game of `gameId`
    function setGameSettings(uint256 numPlayers_, uint256 gameId) external;

    // Registers a player with the `permanentAccount`, public key `pk`, and `gameId`.
    function register(
        address permanentAccount,
        uint256[2] memory pk,
        uint256 gameId
    ) external;

    // Returns the aggregated public key for all players.
    function queryAggregatedPk(uint256 gameId)
        external
        view
        returns (uint256[2] memory);

    // Queries deck.
    function queryDeck(uint256 gameId, uint256 playerIdx)
        external
        view
        returns (Deck memory);

    // Queries the `index`-th card from the deck.
    function queryCardFromDeck(uint256 index, uint256 gameId)
        external
        view
        returns (uint256[4] memory card);

    // Queries the `index`-th card in deal.
    function queryCardInDeal(uint256 index, uint256 gameId)
        external
        view
        returns (uint256[4] memory card);

    // Queries card deal records.
    function queryCardDealRecord(uint256 index, uint256 gameId)
        external
        view
        returns (uint256);

    // Shuffles the deck for `permanentAccount`.
    function shuffleDeck(
        address permanentAccount,
        uint256[52] memory shuffledX0,
        uint256[52] memory shuffledX1,
        uint256[2] memory selector,
        uint256 gameId
    ) external;

    // Updates the shuffle `proof` for `gameId` and `playerIdx`.
    function shuffleProof(
        uint256[8] calldata proof,
        uint256 gameId,
        uint256 playerIdx
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
        uint256 gameId,
        bool shouldVerifyDeal
    ) external;

    // Searches the value of the `cardIndex`-th card in the `gameId`-th game.
    function search(uint256 cardIndex, uint256 gameId)
        external
        view
        returns (uint256);

    // Verifies proof for the deal for `cardIdx` card from `playerIdx` in `gameId` game.
    // Returns true for succeed, false for invalid request, and revert for not passing verification.
    function verifyDeal(
        uint256 gameId,
        uint256 playerIdx,
        uint256 cardIdx
    ) external view returns (bool);

    // Verifies proof for `gameId` and `playerIdx`.
    // Returns true for succeed, false for invalid request, and revert for not passing verification.
    function verifyShuffle(uint256 gameId, uint256 playerIdx)
        external
        view
        returns (bool);
}