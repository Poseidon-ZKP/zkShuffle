//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./IGroup.sol";

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) external view;
}

contract Group is IGroup, SemaphoreGroups {
    mapping(uint256 => IVerifier) internal verifiers;

    mapping(uint256 => address) internal admins;
    modifier onlyAdmin(uint256 id) {
        //require(admins[id] == _msgSender(), "am");
        _;
    }
    function updateGroupAdmin(
        uint256 groupId,
        address newAdmin)
        external override onlyAdmin(groupId)
    {
        admins[groupId] = newAdmin;
    }

    constructor(Verifier[] memory _verifiers) {
        for (uint8 i = 0; i < _verifiers.length; ) {
            verifiers[_verifiers[i].merkleTreeDepth] = IVerifier(_verifiers[i].contractAddress);

            unchecked {
                ++i;
            }
        }
    }

    function createGroup(
        uint256 groupId,
        uint256 merkleTreeDepth,
        address admin
    ) public override {
        require(address(verifiers[merkleTreeDepth]) != address(0));

        _createGroup(groupId, merkleTreeDepth, 0);
        admins[groupId] = admin;
    }

    function addMember(
        uint256 groupId,
        uint256 identityCommitment)
        public override onlyAdmin(groupId)
    {
        _addMember(groupId, identityCommitment);
    }

    function updateMember(
        uint256 groupId,
        uint256 identityCommitment,
        uint256 newIdentityCommitment,
        uint256[] calldata proofSiblings,
        uint8[] calldata proofPathIndices
    ) public override onlyAdmin(groupId) {
        _updateMember(groupId, identityCommitment, newIdentityCommitment, proofSiblings, proofPathIndices);
    }

    function removeMember(
        uint256 groupId,
        uint256 identityCommitment,
        uint256[] calldata proofSiblings,
        uint8[] calldata proofPathIndices
    ) public override onlyAdmin(groupId) {
        _removeMember(groupId, identityCommitment, proofSiblings, proofPathIndices);
    }

    function verifyProof(
        uint256 rc,
        uint256 groupId,
        uint256[8] calldata proof
    ) external view override returns (bool) {
        uint256 merkleTreeDepth = getMerkleTreeDepth(groupId);
        uint256 merkleTreeRoot = getMerkleTreeRoot(groupId);

        IVerifier verifier = verifiers[merkleTreeDepth];
        verifier.verifyProof(
            [proof[0], proof[1]],
            [[proof[2], proof[3]], [proof[4], proof[5]]],
            [proof[6], proof[7]],
            [rc, merkleTreeRoot]
        );
        return true;
    }

}
