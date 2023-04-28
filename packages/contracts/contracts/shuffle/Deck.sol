// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "./BitMaps.sol";

// currently, we support 30 card deck and 52 card deck
enum DeckConfig {
    Deck30Card,
    Deck52Card
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
    // config
    DeckConfig config;
    // x0 of cards
    uint256[] X0;
    // x1 of cards
    uint256[] X1;
    // y0 of cards
    uint256[] Y0;
    // y1 of cards
    uint256[] Y1;
    // 2 selectors for recovering y coordinates
    BitMaps.BitMap256 selector0;
    BitMaps.BitMap256 selector1;
    // deal record
    // for example, DealRecord[0] = 10000... means that
    // the first card has been dealt to the player 0
    mapping(uint256 => BitMaps.BitMap256) dealRecord;
    // set of cards to be dealed
    BitMaps.BitMap256 cardsToDeal;
    // player to deal the cards
    uint256 playerToDeal;
}

// Compressed representation of the Deck
struct CompressedDeck {
    // config
    DeckConfig config;
    // X0 of cards
    uint256[] X0;
    // X1 of cards
    uint256[] X1;
    // 2 selectors of recovering y coordinates
    BitMaps.BitMap256 selector0;
    BitMaps.BitMap256 selector1;
}

struct Card {
    uint256 X;
    uint256 Y;
}

struct DecryptProof {
    uint256[2] A;
    uint256[2][2] B;
    uint256[2] C;
    uint256[8] PI;
}

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

library zkShuffleCrypto {
    function deckSize(DeckConfig config) internal pure returns (uint256 size) {
        if (config == DeckConfig.Deck30Card) {
            size = 30;
        } else {
            size = 52;
        }
    }

    modifier checkDeck(CompressedDeck memory deck) {
        require(deckSize(deck.config) == deck.X0.length, "wrong X0 length");
        require(deckSize(deck.config) == deck.X0.length, "wrong X0 length");
        _;
    }

    function getCompressedDeck(Deck storage deck)
        external
        view
        returns (CompressedDeck memory compDeck)
    {
        compDeck.config = deck.config;
        compDeck.X0 = deck.X0;
        compDeck.X1 = deck.X1;
        compDeck.selector0 = deck.selector0;
        compDeck.selector1 = deck.selector1;
    }

    function setDeckUnsafe(
        CompressedDeck memory compDeck,
        Deck storage deck
    ) external {
        if (compDeck.config != deck.config) {
            deck.config = compDeck.config;
        }
        deck.X0 = compDeck.X0;
        deck.X1 = compDeck.X1;
        deck.selector0 = compDeck.selector0;
        deck.selector1 = compDeck.selector1;
    }

    function shuffleEncPublicInput(
        CompressedDeck memory encDeck,
        CompressedDeck memory oldDeck,
        uint256 nonce,
        uint256 aggPkX,
        uint256 aggPkY
    )
        public
        pure
        checkDeck(encDeck)
        checkDeck(oldDeck)
        returns (uint256[] memory)
    {
        require(encDeck.config == oldDeck.config, "Deck config inconsistent");
        uint256 _deckSize = deckSize(encDeck.config);
        uint256[] memory input = new uint256[](7 + _deckSize * 4);
        input[0] = nonce;
        input[1] = aggPkX;
        input[2] = aggPkY;
        for (uint256 i = 0; i < _deckSize; i++) {
            input[i + 3] = oldDeck.X0[i];
            input[i + 3 + _deckSize] = oldDeck.X1[i];
            input[i + 3 + _deckSize * 2] = encDeck.X0[i];
            input[i + 3 + _deckSize * 3] = encDeck.X1[i];
        }
        input[3 + 4 * _deckSize] = oldDeck.selector0._data;
        input[4 + 4 * _deckSize] = oldDeck.selector1._data;
        input[5 + 4 * _deckSize] = encDeck.selector0._data;
        input[6 + 4 * _deckSize] = encDeck.selector1._data;
        return input;
    }
}
