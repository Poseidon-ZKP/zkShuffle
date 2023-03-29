//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./ISignal.sol";

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[4] memory input
    ) external view;
}

contract Signal is ISignal {
    IVerifier internal verifier;

    /// @dev Gets a nullifier hash and returns true or false.
    /// It is used to prevent double-voting.
    mapping(uint256 => bool) internal nullifierHashes;

    constructor(IVerifier _verifier) {
        verifier = _verifier;
    }

    /// @dev See {ISemaphoreVoting-castVote}.
    function signal(
        uint256 rc,
        bytes32 message,
        uint256 nullifierHash,
        uint256 externalNullifier,
        uint256[8] calldata proof
    ) public override returns (bool) {
        require(nullifierHashes[nullifierHash] == false, "already signal");

        uint256 signalHash = uint256(keccak256(abi.encodePacked(message))) >> 8;
        verifier.verifyProof(
            [proof[0], proof[1]],
            [[proof[2], proof[3]], [proof[4], proof[5]]],
            [proof[6], proof[7]],
            [rc, nullifierHash, signalHash, externalNullifier]
        );

        nullifierHashes[nullifierHash] = true;
        return true;
    }

}
