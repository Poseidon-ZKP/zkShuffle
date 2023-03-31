//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17 || ^0.8.4;

import "@poseidon-zkp/poseidon-zk-circuits/contracts/example_verifier.sol";

// A simple example contract to demostrate how to integrate the verifier contract
contract Example {
    address public verifier;
    uint256 public immutable mulResult = 10;
    constructor(address verifier_) {
        require(verifier_ != address(0), "invalid verifier address");
        verifier = verifier_;
    }

    // Only with valid proof you can join the game
    function joinGameWithProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[2] memory input
    ) external view {
        ExampleVerifier(verifier).verifyProof(a, b, c, input);
    }

}