# Solidity API

## CurveBabyJubJub

### A

```solidity
uint256 A
```

### D

```solidity
uint256 D
```

### Q

```solidity
uint256 Q
```

### pointAdd

```solidity
function pointAdd(uint256 _x1, uint256 _y1, uint256 _x2, uint256 _y2) internal view returns (uint256[2] point)
```

### pointMul

```solidity
function pointMul(uint256 _x1, uint256 _y1, uint256 _d) internal view returns (uint256[2] point)
```

### isOnCurve

```solidity
function isOnCurve(uint256 _x, uint256 _y) internal pure returns (bool)
```

### submod

```solidity
function submod(uint256 _a, uint256 _b, uint256 _mod) internal pure returns (uint256)
```

### inverse

```solidity
function inverse(uint256 _a) internal view returns (uint256)
```

### expmod

```solidity
function expmod(uint256 _b, uint256 _e, uint256 _m) internal view returns (uint256 o)
```

_Helper function to call the bigModExp precompile_

