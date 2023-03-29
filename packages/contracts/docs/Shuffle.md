# Solidity API

## Shuffle

### shuffleEncryptVerifier

```solidity
contract IShuffleEncryptVerifier shuffleEncryptVerifier
```

### decryptVerifier

```solidity
contract IDecryptVerifier decryptVerifier
```

### numPlayers

```solidity
uint256 numPlayers
```

### deck

```solidity
struct Deck deck
```

### cardDeal

```solidity
struct CardDeal cardDeal
```

### playerInfo

```solidity
struct PlayerInfo playerInfo
```

### playerIdx

```solidity
uint256 playerIdx
```

### state

```solidity
enum State state
```

### inDealingPhase

```solidity
modifier inDealingPhase()
```

### constructor

```solidity
constructor(address shuffleEncryptContract, address decryptContract, uint256 specifiedNumPlayer) public
```

### resetRegistration

```solidity
function resetRegistration() internal
```

### resetShuffle

```solidity
function resetShuffle() internal
```

### resetDeal

```solidity
function resetDeal() internal
```

### initDeck

```solidity
function initDeck() internal
```

### register

```solidity
function register(uint256[2] pk) external
```

### queryAggregatedPk

```solidity
function queryAggregatedPk() external view returns (uint256[2])
```

### queryDeck

```solidity
function queryDeck() external view returns (struct Deck)
```

### queryCardFromDeck

```solidity
function queryCardFromDeck(uint256 index) external view returns (uint256[4] card)
```

### queryCardInDeal

```solidity
function queryCardInDeal(uint256 index) external view returns (uint256[4] card)
```

### prepareShuffleData

```solidity
function prepareShuffleData(uint256 nonce, uint256[52] shuffledX0, uint256[52] shuffledX1, uint256[2] selector) internal view returns (uint256[215] input)
```

### updateDeck

```solidity
function updateDeck(uint256[52] shuffledX0, uint256[52] shuffledX1, uint256[2] selector) internal
```

### shuffle

```solidity
function shuffle(uint256[8] proof, uint256 nonce, uint256[52] shuffledX0, uint256[52] shuffledX1, uint256[2] selector) external
```

### decompressEC

```solidity
function decompressEC(uint256 x, uint256 delta, uint256 selector) internal pure returns (uint256)
```

### decompressCard

```solidity
function decompressCard(uint256 cardIdx, uint256[2] delta) internal view returns (uint256[2] Y)
```

### deal

```solidity
function deal(uint256 cardIdx, uint256 curPlayerIdx, uint256[8] proof, uint256[2] decryptedCard, uint256[2] initDelta) external
```

