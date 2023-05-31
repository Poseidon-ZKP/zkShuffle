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

contract DecryptVerifier {
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
    uint256 constant deltax1 = 19133256127707975950691487792451177362565994283806060741327347032806959261921;
    uint256 constant deltax2 = 12594050201927194728935013198382868710096766024870573161837432117376274142958;
    uint256 constant deltay1 = 5020265124747710802123789284081723412845598094160521887960172071062583109047;
    uint256 constant deltay2 = 17174637232039909600979373933534686019562408911886417431413256310520620233064;

    
    uint256 constant IC0x = 5932026459382860604309440879316683197022918149003360191294155741233703232289;
    uint256 constant IC0y = 10190564836545696514491179333959855931734797168140754412925505292086287456157;
    
    uint256 constant IC1x = 18867335583493634013472831141177954825293424828688421198228525342030670068104;
    uint256 constant IC1y = 15381268465466397414659863328587624695240059970282915771760871594047824107403;
    
    uint256 constant IC2x = 11286506025338942578952255893420408569906554872704554862467620266108132264197;
    uint256 constant IC2y = 2491405715760472509167562261482717498704059700756396771077313263264637414832;
    
    uint256 constant IC3x = 3287473577425372258045407890427028857264800329136703662219819676329065521491;
    uint256 constant IC3y = 8621055055780158700687294516025314839109090879823278356759396109602531212398;
    
    uint256 constant IC4x = 13486231092071464017060066625879173946215137105871834475708368644662546379148;
    uint256 constant IC4y = 21121436964731053158654352717071962384336756797046584661227286306159111031971;
    
    uint256 constant IC5x = 14109275663321771783314980339181158967602422131270775459802129831737860909306;
    uint256 constant IC5y = 16924660254912023791796764707642347850615242421495467769065197379355986460351;
    
    uint256 constant IC6x = 3419883549205188749055793320564337243174009629574444717611782109291182659583;
    uint256 constant IC6y = 4382834526475882549762033295157581547532804093976887401310358307095345650082;
    
    uint256 constant IC7x = 3223962897746138668639029759885991824463607401137866309854517055540083501524;
    uint256 constant IC7y = 16082885970618257756451494366838606402295679026944717495804110892597399020825;
    
    uint256 constant IC8x = 8913096594893157129832389718939680598171595295898154761061549479290918885343;
    uint256 constant IC8y = 743871532215761266358119443417771343521019768458421024672232959183096442227;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pDecryptPairing = 128;

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

            function checkDecryptPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pDecryptPairing := add(pMem, pDecryptPairing)
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
                

                // -A
                mstore(_pDecryptPairing, calldataload(pA))
                mstore(add(_pDecryptPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pDecryptPairing, 64), calldataload(pB))
                mstore(add(_pDecryptPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pDecryptPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pDecryptPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pDecryptPairing, 192), alphax)
                mstore(add(_pDecryptPairing, 224), alphay)

                // beta2
                mstore(add(_pDecryptPairing, 256), betax1)
                mstore(add(_pDecryptPairing, 288), betax2)
                mstore(add(_pDecryptPairing, 320), betay1)
                mstore(add(_pDecryptPairing, 352), betay2)

                // vk_x
                mstore(add(_pDecryptPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pDecryptPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pDecryptPairing, 448), gammax1)
                mstore(add(_pDecryptPairing, 480), gammax2)
                mstore(add(_pDecryptPairing, 512), gammay1)
                mstore(add(_pDecryptPairing, 544), gammay2)

                // C
                mstore(add(_pDecryptPairing, 576), calldataload(pC))
                mstore(add(_pDecryptPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pDecryptPairing, 640), deltax1)
                mstore(add(_pDecryptPairing, 672), deltax2)
                mstore(add(_pDecryptPairing, 704), deltay1)
                mstore(add(_pDecryptPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pDecryptPairing, 768, _pDecryptPairing, 0x20)

                isOk := and(success, mload(_pDecryptPairing))
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
            

            // Validate all evaluations
            let isValid := checkDecryptPairing(_pA, _pB, _pC, _pubSignals.offset, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
