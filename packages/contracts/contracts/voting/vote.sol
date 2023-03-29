//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../group/IGroup.sol";
import "../signal/ISignal.sol";

// Compose group/signal primitive
contract Vote {
    IGroup public group;
    ISignal public signal;
    //event VoteAdded(uint256 indexed groupId, bytes32 voteMsg);
    mapping(uint256 => mapping(bytes32 => uint256)) public voteStat;
    uint public GROUP_ID;

    constructor(
        IGroup _group,
        ISignal _signal
    ){
        group  = _group;
        signal = _signal;
        GROUP_ID = 0;
    }

    function createGroup(
        uint256 merkleTreeDepth,
        address admin
    ) external returns (uint) {
        group.createGroup(++GROUP_ID, merkleTreeDepth, admin);
        return GROUP_ID;
    }

    // TODO : Group frozen when vote start.
    function addMember(
        uint256 groupId,
        uint256 identityCommitment
    ) public {
        group.addMember(groupId, identityCommitment);
    }

    function vote(
        uint256 rc,
        // group
        uint256 groupId,
        uint256[8] calldata group_proof,
        // signal
        bytes32 voteMsg,
        uint256 nullifierHash,
        uint256 externalNullifier,
        uint256[8] calldata signal_proof
    ) public {
        require(group.verifyProof(rc, groupId, group_proof), "group proof err");
        require(signal.signal(rc, voteMsg, nullifierHash, externalNullifier, signal_proof), "signal fail");

        //emit VoteAdded(groupId, voteMsg);
        voteStat[groupId][voteMsg] += 1;
    }

}
