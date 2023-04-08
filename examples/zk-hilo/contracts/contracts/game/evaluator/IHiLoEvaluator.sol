// SPDX-License-Identifier: MIT

pragma solidity >=0.8.4;
pragma experimental ABIEncoderV2;

interface IHiLoEvaluator {
    // return the point of a hand
    function evaluate(
        uint firstCard,
        string memory guess,
        uint secondCard
    ) external payable returns (bool);
}
