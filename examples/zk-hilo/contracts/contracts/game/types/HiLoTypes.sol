// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
pragma experimental ABIEncoderV2;

//Bet Types, customize your own bet types, below is the bet type for hilo game
enum HiLoBetType {
    Hi,
    Lo
}

// Game stage, customize your own game stages
enum GameStage {
    NotStarted,
    Started,
    Shuffle,
    Deal,
    Reveal,
    Evaluate,
    Ended
}

// Card rank
enum Rank {
    Spades,
    Hearts,
    Diamonds,
    Clubs
}

// Decoded card info from integers between 0,1,...,51.
// Formally, given an integer v, the Rank is v // 13 and the value is v % 13.
// For example, integer 50 is decoded as:
//      rank: 50 / 13 = 3 (Clubs), value: 50 % 13 = 11 (2,3,4,5,6,7,8,9,10,J,>>Q<<,K,A)
struct CardInfo {
    Rank rank;
    uint256 value;
}

// Board state
struct Board {
    // Current game stage
    GameStage stage;
    // Ephemeral accounts of all players
    address[] permanentAccounts;
    // Chips of each player
    uint256[] chips;
    // Bets from each player
    uint256[] bets;
    // Bets of each round from all players
    uint256[][] betsEachRound;
    uint256[][] betTypeEachRound;
    uint256[][] handCards;
    bool[] playerInPots;
    uint256 nextPlayer;
    uint256 dealer;
    address winner;
    // Required number of players to play
    uint256 numPlayers;
    // Total chips in pot
    uint256 potSize;
    // Public keys of all players
    uint256[][] pks;
    string guess;
}

// Player status in a single board
struct PlayerStatus {
    // Player index
    uint256 index;
}
