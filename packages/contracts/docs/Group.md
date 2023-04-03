# Solidity API

## Group

### verifiers

```solidity
mapping(uint256 => contract IVerifier) verifiers
```

### admins

```solidity
mapping(uint256 => address) admins
```

### onlyAdmin

```solidity
modifier onlyAdmin(uint256 id)
```

### updateGroupAdmin

```solidity
function updateGroupAdmin(uint256 groupId, address newAdmin) external
```

### constructor

```solidity
constructor(struct IGroup.Verifier[] _verifiers) public
```

### createGroup

```solidity
function createGroup(uint256 groupId, uint256 merkleTreeDepth, address admin) public
```

### addMember

```solidity
function addMember(uint256 groupId, uint256 identityCommitment) public
```

### updateMember

```solidity
function updateMember(uint256 groupId, uint256 identityCommitment, uint256 newIdentityCommitment, uint256[] proofSiblings, uint8[] proofPathIndices) public
```

### removeMember

```solidity
function removeMember(uint256 groupId, uint256 identityCommitment, uint256[] proofSiblings, uint8[] proofPathIndices) public
```

### verifyProof

```solidity
function verifyProof(uint256 rc, uint256 groupId, uint256[8] proof) external view returns (bool)
```

