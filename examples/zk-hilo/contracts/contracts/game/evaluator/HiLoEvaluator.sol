// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../../shuffle/IShuffle.sol";

//Game Logic Contract for HiLo
contract HiLoEvaluator {
    address public owner;
    uint public maxBet;

    event GameResult(
        address indexed player,
        uint indexed bet,
        bool indexed win,
        uint payout
    );

    constructor() {
        owner = msg.sender;
        maxBet = 1 ether; // set the maximum bet to 1 ether
    }

    function evaluate(
        uint firstCard,
        string memory guess,
        uint secondCard
    ) public payable {
        require(msg.value > 0 && msg.value <= maxBet, "Invalid bet amount");
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

        uint payout = 0;
        if (win) {
            payout = msg.value * 2; // payout is always twice the bet
            payable(msg.sender).transfer(payout); // send the payout to the player
        }

        emit GameResult(msg.sender, msg.value, win, payout); // emit the game result event
    }

    function withdraw() public {
        require(
            msg.sender == owner,
            "Only the contract owner can withdraw funds"
        );
        payable(msg.sender).transfer(address(this).balance); // withdraw the contract balance to the owner
    }
}
