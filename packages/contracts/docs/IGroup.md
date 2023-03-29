# Solidity API

## IGroup

### Verifier

```solidity
struct Verifier {
  address contractAddress;
  uint256 merkleTreeDepth;
}
```

### updateGroupAdmin

```solidity
function updateGroupAdmin(uint256 groupId, address newAdmin) external
```

### createGroup

```solidity
function createGroup(uint256 groupId, uint256 merkleTreeDepth, address admin) external
```

### addMember

```solidity
function addMember(uint256 groupId, uint256 identityCommitment) external
```

### updateMember

```solidity
function updateMember(uint256 groupId, uint256 identityCommitment, uint256 newIdentityCommitment, uint256[] proofSiblings, uint8[] proofPathIndices) external
```

### removeMember

```solidity
function removeMember(uint256 groupId, uint256 identityCommitment, uint256[] proofSiblings, uint8[] proofPathIndices) external
```

### verifyProof

```solidity
function verifyProof(uint256 rc, uint256 groupId, uint256[8] proof) external returns (bool)
```

