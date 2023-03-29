# Solidity API

## Pairing

### InvalidProof

```solidity
error InvalidProof()
```

### BASE_MODULUS

```solidity
uint256 BASE_MODULUS
```

### SCALAR_MODULUS

```solidity
uint256 SCALAR_MODULUS
```

### G1Point

```solidity
struct G1Point {
  uint256 X;
  uint256 Y;
}
```

### G2Point

```solidity
struct G2Point {
  uint256[2] X;
  uint256[2] Y;
}
```

### P1

```solidity
function P1() internal pure returns (struct Pairing.G1Point)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct Pairing.G1Point | the generator of G1 |

### P2

```solidity
function P2() internal pure returns (struct Pairing.G2Point)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct Pairing.G2Point | the generator of G2 |

### negate

```solidity
function negate(struct Pairing.G1Point p) internal pure returns (struct Pairing.G1Point r)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| r | struct Pairing.G1Point | the negation of p, i.e. p.addition(p.negate()) should be zero. |

### addition

```solidity
function addition(struct Pairing.G1Point p1, struct Pairing.G1Point p2) internal view returns (struct Pairing.G1Point r)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| r | struct Pairing.G1Point | the sum of two points of G1 |

### scalar_mul

```solidity
function scalar_mul(struct Pairing.G1Point p, uint256 s) internal view returns (struct Pairing.G1Point r)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| r | struct Pairing.G1Point | the product of a point on G1 and a scalar, i.e. p == p.scalar_mul(1) and p.addition(p) == p.scalar_mul(2) for all points p. |

### pairingCheck

```solidity
function pairingCheck(struct Pairing.G1Point[] p1, struct Pairing.G2Point[] p2) internal view
```

Asserts the pairing check
e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
For example pairing([P1(), P1().negate()], [P2(), P2()]) should succeed

