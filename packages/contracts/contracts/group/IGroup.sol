//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@semaphore-protocol/contracts/base/SemaphoreGroups.sol";
// Import this contract so we can compile it
import "@poseidon-zkps/poseidon-zk-circuits/contracts/group_verifier.sol";

interface IGroup {
    struct Verifier {
        address contractAddress;
        uint256 merkleTreeDepth;
    }

    function updateGroupAdmin(
        uint256 groupId,
        address newAdmin)
        external;

    function createGroup(
        uint256 groupId,
        uint256 merkleTreeDepth,
        address admin
    ) external;

    function addMember(
        uint256 groupId,
        uint256 identityCommitment)
        external;

    function updateMember(
        uint256 groupId,
        uint256 identityCommitment,
        uint256 newIdentityCommitment,
        uint256[] calldata proofSiblings,
        uint8[] calldata proofPathIndices
    ) external;

    function removeMember(
        uint256 groupId,
        uint256 identityCommitment,
        uint256[] calldata proofSiblings,
        uint8[] calldata proofPathIndices
    ) external;

    function verifyProof(
        uint256 rc,
        uint256 groupId,
        uint256[8] calldata proof
    ) external returns (bool);
}
