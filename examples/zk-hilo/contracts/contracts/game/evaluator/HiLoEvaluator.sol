// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../../shuffle/IShuffle.sol";

//Game Logic Contract for HiLo
contract HiLoEvaluator {
    address public owner;
    uint public maxBet;

    event GameResult(
        address indexed player,
        bool indexed win
    );

    constructor() {
        owner = msg.sender;
        maxBet = 1 ether; // set the maximum bet to 1 ether
    }

    function evalutate(
        uint256 firstCard,
        string memory guess,
        uint256 secondCard
    ) public payable returns (bool) {
        require(firstCard >= 0 && firstCard <= 51, "Invalid first card");
        require(secondCard >= 0 && secondCard <= 51, "Invalid second card");

        uint firstCardRank = firstCard / 4;
        uint secondCardRank = secondCard / 4;

        // determine which card is higher or lower based on the player's guess
        bool win = false;
        if (keccak256(bytes(string(guess))) == keccak256(bytes("higher"))) {
            win = firstCardRank < secondCardRank;
        } else if (
            keccak256(bytes(string(guess))) == keccak256(bytes("lower"))
        ) {
            win = firstCardRank > secondCardRank;
        }
        emit GameResult(msg.sender, win); // emit the game result event

        return win;
    }
}
