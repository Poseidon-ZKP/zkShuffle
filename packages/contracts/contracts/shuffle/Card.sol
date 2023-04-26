// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

// Card as two baby jubjub curve points
struct Card {
    uint256 X0;
    uint256 Y0;
    uint256 X1;
    uint256 Y1;
}

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
    // 2 selectors for recovering y coordinates
    uint256[2] Selector;
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
        if(config == DeckConfig.Deck30Card) {
            size = 30;
        } else {
            size = 52;
        }
    }

    modifier checkDeck(Deck memory deck){
        require(deckSize(deck.config) == deck.X0.length, "wrong X0 length");
        require(deckSize(deck.config) == deck.X0.length, "wrong X0 length");
        _;
    } 

    function shuffleEncPublicInput(
        Deck memory encDeck,
        Deck memory oldDeck,
        uint256 nonce,
        uint256 aggPkX,
        uint256 aggPkY
    ) public pure
    checkDeck(encDeck)
    checkDeck(oldDeck) 
    returns (uint256[] memory) {
        require(encDeck.config == oldDeck.config, "Deck config inconsistent");
        uint256 _deckSize = deckSize(encDeck.config);
        uint256[] memory input = new uint256[](7 + _deckSize * 4);
        input[0] = nonce;
        input[1] = aggPkX;
        input[2] = aggPkY;
        for(uint256 i = 0; i < _deckSize; i++) {
            input[i + 3] = oldDeck.X0[i];
            input[i + 3 + _deckSize] = oldDeck.X1[i];
            input[i + 3 + _deckSize * 2] = encDeck.X0[i];
            input[i + 3 + _deckSize * 3] = encDeck.X1[i];
        }
        input[3 + 4 * _deckSize] = oldDeck.Selector[0];
        input[4 + 4 * _deckSize] = oldDeck.Selector[1];
        input[5 + 4 * _deckSize] = encDeck.Selector[0];
        input[6 + 4 * _deckSize] = encDeck.Selector[1];
        return input;
    }
}