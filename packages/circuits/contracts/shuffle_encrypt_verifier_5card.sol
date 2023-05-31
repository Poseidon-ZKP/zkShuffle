// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Shuffle_encryptVerifier5Card {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 14378794661994809316668936077887579852844330409586136188493910229510707683568;
    uint256 constant alphay  = 19007180918058273234125706522281291487787880146734549337345180962710738215208;
    uint256 constant betax1  = 5920706861016946300912146506670818945013737603659177373891149557636543490740;
    uint256 constant betax2  = 12055325713222300848813253111985210672218263044214498326157766255150057128762;
    uint256 constant betay1  = 9700420230412290932994502491200547761155381189822684608735830492099336040170;
    uint256 constant betay2  = 14277278647337675353039880797101698215986155900184787257566473040310971051502;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 252735810495923738801183751631233857371396144989376150822514979138862067378;
    uint256 constant deltax2 = 13388975630739214190282043557060141865418607169435409421132230974817140614782;
    uint256 constant deltay1 = 17361145977495015535981576444235683216867666559209150777748257562316446015567;
    uint256 constant deltay2 = 15354028123848412196835203426747617718957700300303574815701379171660479364258;

    
    uint256 constant IC0x = 12605301481224084076814534753653563363269953302953957602342811755588757005832;
    uint256 constant IC0y = 13336878183244459961301849819191348530400914384321098255222639768109862126489;
    
    uint256 constant IC1x = 15797271739692117849118395722104004570294468790145016799042815573013348142251;
    uint256 constant IC1y = 14371902201836954104173125144219372626650243773639987888294315629313090747496;
    
    uint256 constant IC2x = 4034368717467305617121878325738586277627701128523036516287190432718571984009;
    uint256 constant IC2y = 15958978955922048529618593671173203105402844771894201157268957942346050252013;
    
    uint256 constant IC3x = 1122626567688671068127576777743594582755181080214642354720937342917698242885;
    uint256 constant IC3y = 4054626872183699386678927426356837446100241236122495239837126925087874944759;
    
    uint256 constant IC4x = 1095902368763990494540144592939034601866701959387860622368904087428389529323;
    uint256 constant IC4y = 14260609248410680550477924688087475296095016250773407945523137491780457202474;
    
    uint256 constant IC5x = 2571162807241485618428447311559338338618710063233517230087093393560643651629;
    uint256 constant IC5y = 836679901545515170381087045454887818456041222652250925960731508699512648899;
    
    uint256 constant IC6x = 2204509561120677189717369376878258071382411296905650585118977333119055246469;
    uint256 constant IC6y = 4708661057362691539461333851176926044358335874624329868382406934322631548022;
    
    uint256 constant IC7x = 16551533063992329317296565755485534589166586875135969711652105680587884296326;
    uint256 constant IC7y = 16923823838665111506534027922310852026610158502232791514006716275153202425252;
    
    uint256 constant IC8x = 7666411569897473321264625813274421593539229789521350573998847844992137377250;
    uint256 constant IC8y = 3590313221524831393970825102426358523232126970155765860651357395678113579556;
    
    uint256 constant IC9x = 6526655603829337329303514373621560439271842383842027607915515898803910754385;
    uint256 constant IC9y = 10032252343931846385916848974384627929489372395782773193069715476569462746212;
    
    uint256 constant IC10x = 15567184224794106309103396079447470216707183877941136991031037443471099890592;
    uint256 constant IC10y = 14254043602607875736414462554277194067356429313631187390968741621265868654519;
    
    uint256 constant IC11x = 12129276567829309291753925486206953029876368002870256114377270433450520370032;
    uint256 constant IC11y = 15551599213140323917717964522954379695647891635741415094626445583692952245375;
    
    uint256 constant IC12x = 14764587306143723447505657542166698539305667233271557374378005583543545538660;
    uint256 constant IC12y = 8081773175123039440376335201591903351734093108858317033516344337488734462907;
    
    uint256 constant IC13x = 18596378953457315403096634894117819770226556744236843945556897763364025182344;
    uint256 constant IC13y = 7025811986233480437605260108404291719482884986549756363036753235837352203330;
    
    uint256 constant IC14x = 15426616601311647025122800427489308232552128809629188184960077488536590261996;
    uint256 constant IC14y = 16118693824256111815791082062804304128469933524288761683699917686211808424079;
    
    uint256 constant IC15x = 12638852898193221601494731690471242760577636730429317275910129472530344366793;
    uint256 constant IC15y = 7779827022071055668918626002819596528694390053789855619352005170987610442777;
    
    uint256 constant IC16x = 13596092911586604679855954809488107368895837055161340131482056207844835976822;
    uint256 constant IC16y = 11718418032461291066305406451870139889692592213843425906800910642640348967604;
    
    uint256 constant IC17x = 10066716244517403489656877490337123031603775714778469778885174027829025252068;
    uint256 constant IC17y = 16848012846379270900266249671026972822918871733770679517065404799068658850379;
    
    uint256 constant IC18x = 13219577235826787970328821008591026676843532219444469338537300465131643934704;
    uint256 constant IC18y = 13042386039516901670252231291513032964552702935802106008645490888033889216755;
    
    uint256 constant IC19x = 11981996561099056459063896357435587179953113177502818039846465871618139993859;
    uint256 constant IC19y = 21462758177026843425645555854897230002814910143823874958258577422863600484862;
    
    uint256 constant IC20x = 14168930243982723511045927164777315811688611983221628666269149744145293819834;
    uint256 constant IC20y = 16926425929984079551788717924927374694763609671902857913554083439443519366615;
    
    uint256 constant IC21x = 3436172787183821914504624824937218390657074621742928958866354159960203749214;
    uint256 constant IC21y = 18984286102931858585486411157292798834623688572440011536679516276589022326346;
    
    uint256 constant IC22x = 3256090004364924635230548285790990036657234850917833165111189055449810996439;
    uint256 constant IC22y = 2446706511321339393673096148755141118779169319949683937575727153750049712628;
    
    uint256 constant IC23x = 6624539936525614848681139996761665162987038060124795649824906251887974974594;
    uint256 constant IC23y = 3503972814033097147542452603091163459553514057606380152926850231780205032284;
    
    uint256 constant IC24x = 2374346882514012092217278240690889268740519921449702252554889112865071307750;
    uint256 constant IC24y = 18256075448555123971704351580408855783676364654612859747828597101568807764032;
    
    uint256 constant IC25x = 1826266636848599216519889198834091288971263400793913128366562456473594349214;
    uint256 constant IC25y = 1555591188144723213447268210727081953050629984437310406732210929812853271187;
    
    uint256 constant IC26x = 10967126027420372361524701596255729676794306256102767580742602540980615732333;
    uint256 constant IC26y = 17705858636559610770069860006523588048585546108115489332443863095855130601459;
    
    uint256 constant IC27x = 6935148232006145905791506859799859540975142177530947203743394148665641018055;
    uint256 constant IC27y = 19243221365454478963907002597691768829042636373560383488839417989822185746388;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pShuffle_encryptPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, q)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkShuffle_encryptPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pShuffle_encryptPairing := add(pMem, pShuffle_encryptPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                
                g1_mulAccC(_pVk, IC17x, IC17y, calldataload(add(pubSignals, 512)))
                
                g1_mulAccC(_pVk, IC18x, IC18y, calldataload(add(pubSignals, 544)))
                
                g1_mulAccC(_pVk, IC19x, IC19y, calldataload(add(pubSignals, 576)))
                
                g1_mulAccC(_pVk, IC20x, IC20y, calldataload(add(pubSignals, 608)))
                
                g1_mulAccC(_pVk, IC21x, IC21y, calldataload(add(pubSignals, 640)))
                
                g1_mulAccC(_pVk, IC22x, IC22y, calldataload(add(pubSignals, 672)))
                
                g1_mulAccC(_pVk, IC23x, IC23y, calldataload(add(pubSignals, 704)))
                
                g1_mulAccC(_pVk, IC24x, IC24y, calldataload(add(pubSignals, 736)))
                
                g1_mulAccC(_pVk, IC25x, IC25y, calldataload(add(pubSignals, 768)))
                
                g1_mulAccC(_pVk, IC26x, IC26y, calldataload(add(pubSignals, 800)))
                
                g1_mulAccC(_pVk, IC27x, IC27y, calldataload(add(pubSignals, 832)))
                

                // -A
                mstore(_pShuffle_encryptPairing, calldataload(pA))
                mstore(add(_pShuffle_encryptPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pShuffle_encryptPairing, 64), calldataload(pB))
                mstore(add(_pShuffle_encryptPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pShuffle_encryptPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pShuffle_encryptPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pShuffle_encryptPairing, 192), alphax)
                mstore(add(_pShuffle_encryptPairing, 224), alphay)

                // beta2
                mstore(add(_pShuffle_encryptPairing, 256), betax1)
                mstore(add(_pShuffle_encryptPairing, 288), betax2)
                mstore(add(_pShuffle_encryptPairing, 320), betay1)
                mstore(add(_pShuffle_encryptPairing, 352), betay2)

                // vk_x
                mstore(add(_pShuffle_encryptPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pShuffle_encryptPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pShuffle_encryptPairing, 448), gammax1)
                mstore(add(_pShuffle_encryptPairing, 480), gammax2)
                mstore(add(_pShuffle_encryptPairing, 512), gammay1)
                mstore(add(_pShuffle_encryptPairing, 544), gammay2)

                // C
                mstore(add(_pShuffle_encryptPairing, 576), calldataload(pC))
                mstore(add(_pShuffle_encryptPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pShuffle_encryptPairing, 640), deltax1)
                mstore(add(_pShuffle_encryptPairing, 672), deltax2)
                mstore(add(_pShuffle_encryptPairing, 704), deltay1)
                mstore(add(_pShuffle_encryptPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pShuffle_encryptPairing, 768, _pShuffle_encryptPairing, 0x20)

                isOk := and(success, mload(_pShuffle_encryptPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals.offset, 0)))
            
            checkField(calldataload(add(_pubSignals.offset, 32)))
            
            checkField(calldataload(add(_pubSignals.offset, 64)))
            
            checkField(calldataload(add(_pubSignals.offset, 96)))
            
            checkField(calldataload(add(_pubSignals.offset, 128)))
            
            checkField(calldataload(add(_pubSignals.offset, 160)))
            
            checkField(calldataload(add(_pubSignals.offset, 192)))
            
            checkField(calldataload(add(_pubSignals.offset, 224)))
            
            checkField(calldataload(add(_pubSignals.offset, 256)))
            
            checkField(calldataload(add(_pubSignals.offset, 288)))
            
            checkField(calldataload(add(_pubSignals.offset, 320)))
            
            checkField(calldataload(add(_pubSignals.offset, 352)))
            
            checkField(calldataload(add(_pubSignals.offset, 384)))
            
            checkField(calldataload(add(_pubSignals.offset, 416)))
            
            checkField(calldataload(add(_pubSignals.offset, 448)))
            
            checkField(calldataload(add(_pubSignals.offset, 480)))
            
            checkField(calldataload(add(_pubSignals.offset, 512)))
            
            checkField(calldataload(add(_pubSignals.offset, 544)))
            
            checkField(calldataload(add(_pubSignals.offset, 576)))
            
            checkField(calldataload(add(_pubSignals.offset, 608)))
            
            checkField(calldataload(add(_pubSignals.offset, 640)))
            
            checkField(calldataload(add(_pubSignals.offset, 672)))
            
            checkField(calldataload(add(_pubSignals.offset, 704)))
            
            checkField(calldataload(add(_pubSignals.offset, 736)))
            
            checkField(calldataload(add(_pubSignals.offset, 768)))
            
            checkField(calldataload(add(_pubSignals.offset, 800)))
            
            checkField(calldataload(add(_pubSignals.offset, 832)))
            
            checkField(calldataload(add(_pubSignals.offset, 864)))
            

            // Validate all evaluations
            let isValid := checkShuffle_encryptPairing(_pA, _pB, _pC, _pubSignals.offset, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
