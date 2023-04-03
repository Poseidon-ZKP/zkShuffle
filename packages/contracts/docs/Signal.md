# Solidity API

## Signal

### verifier

```solidity
contract IVerifier verifier
```

### nullifierHashes

```solidity
mapping(uint256 => bool) nullifierHashes
```

_Gets a nullifier hash and returns true or false.
It is used to prevent double-voting._

### constructor

```solidity
constructor(contract IVerifier _verifier) public
```

### signal

```solidity
function signal(uint256 rc, bytes32 message, uint256 nullifierHash, uint256 externalNullifier, uint256[8] proof) public returns (bool)
```

_See {ISemaphoreVoting-castVote}._

