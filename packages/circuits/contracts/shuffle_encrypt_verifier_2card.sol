//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// 2019 OKIMS
//      ported to solidity 0.6
//      fixed linter warnings
//      added requiere error messages
//
// 2021 Remco Bloemen
//       cleaned up code
//       added InvalidProve() error
//       always revert with InvalidProof() on invalid proof
//       make Shuffle_encryptPairing2Card strict
//
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4 || ^0.8.17;

library Shuffle_encryptPairing2Card {
  error InvalidProof();

  // The prime q in the base field F_q for G1
  uint256 constant BASE_MODULUS = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

  // The prime moludus of the scalar field of G1.
  uint256 constant SCALAR_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

  struct G1Point {
    uint256 X;
    uint256 Y;
  }

  // Encoding of field elements is: X[0] * z + X[1]
  struct G2Point {
    uint256[2] X;
    uint256[2] Y;
  }

  /// @return the generator of G1
  function P1() internal pure returns (G1Point memory) {
    return G1Point(1, 2);
  }

  /// @return the generator of G2
  function P2() internal pure returns (G2Point memory) {
    return
      G2Point(
        [
          11559732032986387107991004021392285783925812861821192530917403151452391805634,
          10857046999023057135944570762232829481370756359578518086990519993285655852781
        ],
        [
          4082367875863433681332203403145435568316851327593401208105741076214120093531,
          8495653923123431417604973247489272438418190587263600148770280649306958101930
        ]
      );
  }

  /// @return r the negation of p, i.e. p.addition(p.negate()) should be zero.
  function negate(G1Point memory p) internal pure returns (G1Point memory r) {
    if (p.X == 0 && p.Y == 0) return G1Point(0, 0);
    // Validate input or revert
    if (p.X >= BASE_MODULUS || p.Y >= BASE_MODULUS) revert InvalidProof();
    // We know p.Y > 0 and p.Y < BASE_MODULUS.
    return G1Point(p.X, BASE_MODULUS - p.Y);
  }

  /// @return r the sum of two points of G1
  function addition(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {
    // By EIP-196 all input is validated to be less than the BASE_MODULUS and form points
    // on the curve.
    uint256[4] memory input;
    input[0] = p1.X;
    input[1] = p1.Y;
    input[2] = p2.X;
    input[3] = p2.Y;
    bool success;
    // solium-disable-next-line security/no-inline-assembly
    assembly {
      success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
    }
    if (!success) revert InvalidProof();
  }

  /// @return r the product of a point on G1 and a scalar, i.e.
  /// p == p.scalar_mul(1) and p.addition(p) == p.scalar_mul(2) for all points p.
  function scalar_mul(G1Point memory p, uint256 s) internal view returns (G1Point memory r) {
    // By EIP-196 the values p.X and p.Y are verified to less than the BASE_MODULUS and
    // form a valid point on the curve. But the scalar is not verified, so we do that explicitelly.
    if (s >= SCALAR_MODULUS) revert InvalidProof();
    uint256[3] memory input;
    input[0] = p.X;
    input[1] = p.Y;
    input[2] = s;
    bool success;
    // solium-disable-next-line security/no-inline-assembly
    assembly {
      success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
    }
    if (!success) revert InvalidProof();
  }

  /// Asserts the pairing check
  /// e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
  /// For example pairing([P1(), P1().negate()], [P2(), P2()]) should succeed
  function pairingCheck(G1Point[] memory p1, G2Point[] memory p2) internal view {
    // By EIP-197 all input is verified to be less than the BASE_MODULUS and form elements in their
    // respective groups of the right order.
    if (p1.length != p2.length) revert InvalidProof();
    uint256 elements = p1.length;
    uint256 inputSize = elements * 6;
    uint256[] memory input = new uint256[](inputSize);
    for (uint256 i = 0; i < elements; i++) {
      input[i * 6 + 0] = p1[i].X;
      input[i * 6 + 1] = p1[i].Y;
      input[i * 6 + 2] = p2[i].X[0];
      input[i * 6 + 3] = p2[i].X[1];
      input[i * 6 + 4] = p2[i].Y[0];
      input[i * 6 + 5] = p2[i].Y[1];
    }
    uint256[1] memory out;
    bool success;
    // solium-disable-next-line security/no-inline-assembly
    assembly {
      success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
    }
    if (!success || out[0] != 1) revert InvalidProof();
  }
}

contract Shuffle_encryptVerifier2Card {
  using Shuffle_encryptPairing2Card for *;

  struct VerifyingKey {
    Shuffle_encryptPairing2Card.G1Point alfa1;
    Shuffle_encryptPairing2Card.G2Point beta2;
    Shuffle_encryptPairing2Card.G2Point gamma2;
    Shuffle_encryptPairing2Card.G2Point delta2;
    Shuffle_encryptPairing2Card.G1Point[] IC;
  }

  struct Proof {
    Shuffle_encryptPairing2Card.G1Point A;
    Shuffle_encryptPairing2Card.G2Point B;
    Shuffle_encryptPairing2Card.G1Point C;
  }

  function verifyingKey() internal pure returns (VerifyingKey memory vk) {
    vk.alfa1 = Shuffle_encryptPairing2Card.G1Point(
      14378794661994809316668936077887579852844330409586136188493910229510707683568,
      19007180918058273234125706522281291487787880146734549337345180962710738215208
    );

    vk.beta2 = Shuffle_encryptPairing2Card.G2Point(
      [5920706861016946300912146506670818945013737603659177373891149557636543490740, 12055325713222300848813253111985210672218263044214498326157766255150057128762],
      [9700420230412290932994502491200547761155381189822684608735830492099336040170, 14277278647337675353039880797101698215986155900184787257566473040310971051502]
    );

    vk.gamma2 = Shuffle_encryptPairing2Card.G2Point(
      [11559732032986387107991004021392285783925812861821192530917403151452391805634, 10857046999023057135944570762232829481370756359578518086990519993285655852781],
      [4082367875863433681332203403145435568316851327593401208105741076214120093531, 8495653923123431417604973247489272438418190587263600148770280649306958101930]
    );

    vk.delta2 = Shuffle_encryptPairing2Card.G2Point(
      [9549821333551887797603075733973116598170436215406646564324025647008401271961, 6796298385992333315943803315730040402138489063116000220242604174843353357155],
      [7456039608312166853299504070853895672382789041965724478928661512931893920872, 13516747064448718099604894838784936315401197773167555557534369760276688188502]
    );

    vk.IC = new Shuffle_encryptPairing2Card.G1Point[](16);

    
      vk.IC[0] = Shuffle_encryptPairing2Card.G1Point(
        15960194862232511317578449809452893975344679446478926679174039523077074217359,
        85212271012323071890791501803619245042889311289392767803986470334572917361
      );
    
      vk.IC[1] = Shuffle_encryptPairing2Card.G1Point(
        20540584502802721788216234592277882837511380917277445404935126660760382622875,
        21430567371110589624125554512219079410856514732743751810877616359055492897311
      );
    
      vk.IC[2] = Shuffle_encryptPairing2Card.G1Point(
        3034014871696744296828110107298422803970218208558021391634319872278564496439,
        5574397800146837654308118770831571728364381383088398040599788808382491176711
      );
    
      vk.IC[3] = Shuffle_encryptPairing2Card.G1Point(
        9517604261011255013018878500819551494837022729512198203081686653375076188527,
        14453943153988246703762408982768232234065880371561699412553914796835860459432
      );
    
      vk.IC[4] = Shuffle_encryptPairing2Card.G1Point(
        149599666888711597310420330829528507981637323096753892308129197539268906378,
        4532674204879799874451835889899917023319625929648107569058196683650894971409
      );
    
      vk.IC[5] = Shuffle_encryptPairing2Card.G1Point(
        2579682021686203422127651216502860347194966111802501163070762320251092506026,
        13540657612157696238954872717436514553738685276025588753937121666163598480997
      );
    
      vk.IC[6] = Shuffle_encryptPairing2Card.G1Point(
        2012975375254096699358689506235520900579853870238412221587244125566937316544,
        11426386003473395312767509078936883495918012508080620990367791363118589850941
      );
    
      vk.IC[7] = Shuffle_encryptPairing2Card.G1Point(
        2276348554239839361439285994856516114621828794661092747070917432270797783204,
        3099511794912452193213910250188948371796526899251080831354765215025929146255
      );
    
      vk.IC[8] = Shuffle_encryptPairing2Card.G1Point(
        15408192254320221732691578483874529450823104435047321610728756056659040054636,
        15491719954191239468634775451439121641978457647557554324978818204754871171124
      );
    
      vk.IC[9] = Shuffle_encryptPairing2Card.G1Point(
        1355945286869107029400893826593244165137928793363938110160139700932082261157,
        13076595718553405142359610109429801472528551133406641297466230252305647728038
      );
    
      vk.IC[10] = Shuffle_encryptPairing2Card.G1Point(
        12978107003764894071179080696157685905318254110011405233736643627982104004638,
        17020608709437243836756948549271844032516586011252936080517436213211276078680
      );
    
      vk.IC[11] = Shuffle_encryptPairing2Card.G1Point(
        4554418831541579750287582074963599306694904963425488341438028929592073591854,
        10071284262699105973355613524694010171277268001039951884021078583415723904477
      );
    
      vk.IC[12] = Shuffle_encryptPairing2Card.G1Point(
        11969480035533479474685087984004323125378635347901307991678651266512507390576,
        7548317071444057424772065990930292513330981326175832935179677606590420592589
      );
    
      vk.IC[13] = Shuffle_encryptPairing2Card.G1Point(
        4468281829482042347554877862210972898413936621413973122599049522284787858896,
        4300605018580683964203178803978336044386997596839179086525488681145971877423
      );
    
      vk.IC[14] = Shuffle_encryptPairing2Card.G1Point(
        7034883786445244476055197045551107107816560051645784761750678212536939634235,
        17322540008548282923111817014668509528660457047416091267231217544112513830487
      );
    
      vk.IC[15] = Shuffle_encryptPairing2Card.G1Point(
        853906971546794676775893722242855420437951111121523717068891252456223594065,
        17149536524536100470161656154388028138235618443312162686075724488446140124146
      );
    
  }

  /// @dev Verifies a Semaphore proof. Reverts with InvalidProof if the proof is invalid.
  function verifyProof(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[] memory input
  ) public view {
    // If the values are not in the correct range, the Shuffle_encryptPairing2Card contract will revert.
    Proof memory proof;
    proof.A = Shuffle_encryptPairing2Card.G1Point(a[0], a[1]);
    proof.B = Shuffle_encryptPairing2Card.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
    proof.C = Shuffle_encryptPairing2Card.G1Point(c[0], c[1]);

    VerifyingKey memory vk = verifyingKey();

    // Compute the linear combination vk_x of inputs times IC
    if (input.length + 1 != vk.IC.length) revert Shuffle_encryptPairing2Card.InvalidProof();
    Shuffle_encryptPairing2Card.G1Point memory vk_x = vk.IC[0];
    for (uint i = 0; i < input.length; i++) {
      vk_x = Shuffle_encryptPairing2Card.addition(vk_x, Shuffle_encryptPairing2Card.scalar_mul(vk.IC[i+1], input[i]));
    }

    // Check pairing
    Shuffle_encryptPairing2Card.G1Point[] memory p1 = new Shuffle_encryptPairing2Card.G1Point[](4);
    Shuffle_encryptPairing2Card.G2Point[] memory p2 = new Shuffle_encryptPairing2Card.G2Point[](4);
    p1[0] = Shuffle_encryptPairing2Card.negate(proof.A);
    p2[0] = proof.B;
    p1[1] = vk.alfa1;
    p2[1] = vk.beta2;
    p1[2] = vk_x;
    p2[2] = vk.gamma2;
    p1[3] = proof.C;
    p2[3] = vk.delta2;
    Shuffle_encryptPairing2Card.pairingCheck(p1, p2);
  }
}
