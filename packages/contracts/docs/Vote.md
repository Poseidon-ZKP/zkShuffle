# Solidity API

## Vote

### group

```solidity
contract IGroup group
```

### signal

```solidity
contract ISignal signal
```

### voteStat

```solidity
mapping(uint256 => mapping(bytes32 => uint256)) voteStat
```

### GROUP_ID

```solidity
uint256 GROUP_ID
```

### constructor

```solidity
constructor(contract IGroup _group, contract ISignal _signal) public
```

### createGroup

```solidity
function createGroup(uint256 merkleTreeDepth, address admin) external returns (uint256)
```

### addMember

```solidity
function addMember(uint256 groupId, uint256 identityCommitment) public
```

### vote

```solidity
function vote(uint256 rc, uint256 groupId, uint256[8] group_proof, bytes32 voteMsg, uint256 nullifierHash, uint256 externalNullifier, uint256[8] signal_proof) public
```

