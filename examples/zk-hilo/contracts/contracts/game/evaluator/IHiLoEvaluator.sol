// SPDX-License-Identifier: MIT

pragma solidity >=0.8.4;
pragma experimental ABIEncoderV2;

interface IHiLoEvaluator {
    // return the point of a hand
    function evaluate(uint256 firstCard, string memory guess, uint256 secondCard) external payable;

}