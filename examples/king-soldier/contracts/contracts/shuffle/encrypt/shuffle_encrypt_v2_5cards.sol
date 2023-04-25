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
//       make Shuffle_encryptPairing strict
//
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4 || ^0.8.17;

library Shuffle_encryptPairing {
    error InvalidProof();

    // The prime q in the base field F_q for G1
    uint256 constant BASE_MODULUS =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // The prime moludus of the scalar field of G1.
    uint256 constant SCALAR_MODULUS =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

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
    function addition(
        G1Point memory p1,
        G1Point memory p2
    ) internal view returns (G1Point memory r) {
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
    function scalar_mul(
        G1Point memory p,
        uint256 s
    ) internal view returns (G1Point memory r) {
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
    function pairingCheck(
        G1Point[] memory p1,
        G2Point[] memory p2
    ) internal view {
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
            success := staticcall(
                sub(gas(), 2000),
                8,
                add(input, 0x20),
                mul(inputSize, 0x20),
                out,
                0x20
            )
        }
        if (!success || out[0] != 1) revert InvalidProof();
    }
}

contract Shuffle_encryptVerifier_5cards {
    using Shuffle_encryptPairing for *;

    struct VerifyingKey {
        Shuffle_encryptPairing.G1Point alfa1;
        Shuffle_encryptPairing.G2Point beta2;
        Shuffle_encryptPairing.G2Point gamma2;
        Shuffle_encryptPairing.G2Point delta2;
        Shuffle_encryptPairing.G1Point[] IC;
    }

    struct Proof {
        Shuffle_encryptPairing.G1Point A;
        Shuffle_encryptPairing.G2Point B;
        Shuffle_encryptPairing.G1Point C;
    }

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alfa1 = Shuffle_encryptPairing.G1Point(
            14378794661994809316668936077887579852844330409586136188493910229510707683568,
            19007180918058273234125706522281291487787880146734549337345180962710738215208
        );

        vk.beta2 = Shuffle_encryptPairing.G2Point(
            [
                5920706861016946300912146506670818945013737603659177373891149557636543490740,
                12055325713222300848813253111985210672218263044214498326157766255150057128762
            ],
            [
                9700420230412290932994502491200547761155381189822684608735830492099336040170,
                14277278647337675353039880797101698215986155900184787257566473040310971051502
            ]
        );

        vk.gamma2 = Shuffle_encryptPairing.G2Point(
            [
                11559732032986387107991004021392285783925812861821192530917403151452391805634,
                10857046999023057135944570762232829481370756359578518086990519993285655852781
            ],
            [
                4082367875863433681332203403145435568316851327593401208105741076214120093531,
                8495653923123431417604973247489272438418190587263600148770280649306958101930
            ]
        );

        vk.delta2 = Shuffle_encryptPairing.G2Point(
            [
                2829396632989663368538948652728679722099782049928712508277812123545821538138,
                2129350551260367212241490851194934334960455530599066456059015955615855912419
            ],
            [
                5099223454239202659364803173167877917847834360298659131518257458066194769299,
                10444005757168923979087603570223630064845647674062141217069608654129562438508
            ]
        );

        vk.IC = new Shuffle_encryptPairing.G1Point[](28);

        vk.IC[0] = Shuffle_encryptPairing.G1Point(
            12605301481224084076814534753653563363269953302953957602342811755588757005832,
            13336878183244459961301849819191348530400914384321098255222639768109862126489
        );

        vk.IC[1] = Shuffle_encryptPairing.G1Point(
            15797271739692117849118395722104004570294468790145016799042815573013348142251,
            14371902201836954104173125144219372626650243773639987888294315629313090747496
        );

        vk.IC[2] = Shuffle_encryptPairing.G1Point(
            4034368717467305617121878325738586277627701128523036516287190432718571984009,
            15958978955922048529618593671173203105402844771894201157268957942346050252013
        );

        vk.IC[3] = Shuffle_encryptPairing.G1Point(
            1122626567688671068127576777743594582755181080214642354720937342917698242885,
            4054626872183699386678927426356837446100241236122495239837126925087874944759
        );

        vk.IC[4] = Shuffle_encryptPairing.G1Point(
            1095902368763990494540144592939034601866701959387860622368904087428389529323,
            14260609248410680550477924688087475296095016250773407945523137491780457202474
        );

        vk.IC[5] = Shuffle_encryptPairing.G1Point(
            2571162807241485618428447311559338338618710063233517230087093393560643651629,
            836679901545515170381087045454887818456041222652250925960731508699512648899
        );

        vk.IC[6] = Shuffle_encryptPairing.G1Point(
            2204509561120677189717369376878258071382411296905650585118977333119055246469,
            4708661057362691539461333851176926044358335874624329868382406934322631548022
        );

        vk.IC[7] = Shuffle_encryptPairing.G1Point(
            16551533063992329317296565755485534589166586875135969711652105680587884296326,
            16923823838665111506534027922310852026610158502232791514006716275153202425252
        );

        vk.IC[8] = Shuffle_encryptPairing.G1Point(
            7666411569897473321264625813274421593539229789521350573998847844992137377250,
            3590313221524831393970825102426358523232126970155765860651357395678113579556
        );

        vk.IC[9] = Shuffle_encryptPairing.G1Point(
            6526655603829337329303514373621560439271842383842027607915515898803910754385,
            10032252343931846385916848974384627929489372395782773193069715476569462746212
        );

        vk.IC[10] = Shuffle_encryptPairing.G1Point(
            15567184224794106309103396079447470216707183877941136991031037443471099890592,
            14254043602607875736414462554277194067356429313631187390968741621265868654519
        );

        vk.IC[11] = Shuffle_encryptPairing.G1Point(
            12129276567829309291753925486206953029876368002870256114377270433450520370032,
            15551599213140323917717964522954379695647891635741415094626445583692952245375
        );

        vk.IC[12] = Shuffle_encryptPairing.G1Point(
            14764587306143723447505657542166698539305667233271557374378005583543545538660,
            8081773175123039440376335201591903351734093108858317033516344337488734462907
        );

        vk.IC[13] = Shuffle_encryptPairing.G1Point(
            18596378953457315403096634894117819770226556744236843945556897763364025182344,
            7025811986233480437605260108404291719482884986549756363036753235837352203330
        );

        vk.IC[14] = Shuffle_encryptPairing.G1Point(
            15426616601311647025122800427489308232552128809629188184960077488536590261996,
            16118693824256111815791082062804304128469933524288761683699917686211808424079
        );

        vk.IC[15] = Shuffle_encryptPairing.G1Point(
            12638852898193221601494731690471242760577636730429317275910129472530344366793,
            7779827022071055668918626002819596528694390053789855619352005170987610442777
        );

        vk.IC[16] = Shuffle_encryptPairing.G1Point(
            13596092911586604679855954809488107368895837055161340131482056207844835976822,
            11718418032461291066305406451870139889692592213843425906800910642640348967604
        );

        vk.IC[17] = Shuffle_encryptPairing.G1Point(
            10066716244517403489656877490337123031603775714778469778885174027829025252068,
            16848012846379270900266249671026972822918871733770679517065404799068658850379
        );

        vk.IC[18] = Shuffle_encryptPairing.G1Point(
            13219577235826787970328821008591026676843532219444469338537300465131643934704,
            13042386039516901670252231291513032964552702935802106008645490888033889216755
        );

        vk.IC[19] = Shuffle_encryptPairing.G1Point(
            11981996561099056459063896357435587179953113177502818039846465871618139993859,
            21462758177026843425645555854897230002814910143823874958258577422863600484862
        );

        vk.IC[20] = Shuffle_encryptPairing.G1Point(
            14168930243982723511045927164777315811688611983221628666269149744145293819834,
            16926425929984079551788717924927374694763609671902857913554083439443519366615
        );

        vk.IC[21] = Shuffle_encryptPairing.G1Point(
            3436172787183821914504624824937218390657074621742928958866354159960203749214,
            18984286102931858585486411157292798834623688572440011536679516276589022326346
        );

        vk.IC[22] = Shuffle_encryptPairing.G1Point(
            3256090004364924635230548285790990036657234850917833165111189055449810996439,
            2446706511321339393673096148755141118779169319949683937575727153750049712628
        );

        vk.IC[23] = Shuffle_encryptPairing.G1Point(
            6624539936525614848681139996761665162987038060124795649824906251887974974594,
            3503972814033097147542452603091163459553514057606380152926850231780205032284
        );

        vk.IC[24] = Shuffle_encryptPairing.G1Point(
            2374346882514012092217278240690889268740519921449702252554889112865071307750,
            18256075448555123971704351580408855783676364654612859747828597101568807764032
        );

        vk.IC[25] = Shuffle_encryptPairing.G1Point(
            1826266636848599216519889198834091288971263400793913128366562456473594349214,
            1555591188144723213447268210727081953050629984437310406732210929812853271187
        );

        vk.IC[26] = Shuffle_encryptPairing.G1Point(
            10967126027420372361524701596255729676794306256102767580742602540980615732333,
            17705858636559610770069860006523588048585546108115489332443863095855130601459
        );

        vk.IC[27] = Shuffle_encryptPairing.G1Point(
            6935148232006145905791506859799859540975142177530947203743394148665641018055,
            19243221365454478963907002597691768829042636373560383488839417989822185746388
        );
    }

    /// @dev Verifies a Semaphore proof. Reverts with InvalidProof if the proof is invalid.
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[27] memory input
    ) public view {
        // If the values are not in the correct range, the Shuffle_encryptPairing contract will revert.
        Proof memory proof;
        proof.A = Shuffle_encryptPairing.G1Point(a[0], a[1]);
        proof.B = Shuffle_encryptPairing.G2Point(
            [b[0][0], b[0][1]],
            [b[1][0], b[1][1]]
        );
        proof.C = Shuffle_encryptPairing.G1Point(c[0], c[1]);

        VerifyingKey memory vk = verifyingKey();

        // Compute the linear combination vk_x of inputs times IC
        if (input.length + 1 != vk.IC.length)
            revert Shuffle_encryptPairing.InvalidProof();
        Shuffle_encryptPairing.G1Point memory vk_x = vk.IC[0];
        for (uint256 i = 0; i < input.length; i++) {
            vk_x = Shuffle_encryptPairing.addition(
                vk_x,
                Shuffle_encryptPairing.scalar_mul(vk.IC[i + 1], input[i])
            );
        }

        // Check pairing
        Shuffle_encryptPairing.G1Point[]
            memory p1 = new Shuffle_encryptPairing.G1Point[](4);
        Shuffle_encryptPairing.G2Point[]
            memory p2 = new Shuffle_encryptPairing.G2Point[](4);
        p1[0] = Shuffle_encryptPairing.negate(proof.A);
        p2[0] = proof.B;
        p1[1] = vk.alfa1;
        p2[1] = vk.beta2;
        p1[2] = vk_x;
        p2[2] = vk.gamma2;
        p1[3] = proof.C;
        p2[3] = vk.delta2;
        Shuffle_encryptPairing.pairingCheck(p1, p2);
    }
}
