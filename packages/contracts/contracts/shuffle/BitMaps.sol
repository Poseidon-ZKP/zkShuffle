// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

// a single BitMap implementation inspired by 
// https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/structs/BitMaps.sol
library BitMaps {
    struct BitMap256 {
        uint256 _data;
    }

    /**
     * @dev Returns whether the bit at `index` is set.
     */
    function get(BitMap256 memory bitmap, uint256 index) internal pure returns (bool) {
        require(index < 256, "index out of range");
        uint256 mask = 1 << (index & 0xff);
        return bitmap._data & mask != 0;
    }

    /**
     * @dev Sets the bit at `index` to the boolean `value`.
     */
    function setTo(BitMap256 storage bitmap, uint256 index, bool value) internal {
        if (value) {
            set(bitmap, index);
        } else {
            unset(bitmap, index);
        }
    }

      /**
     * @dev Sets the bit at `index`.
     */
    function set(BitMap256 storage bitmap, uint256 index) internal {
        uint256 mask = 1 << (index & 0xff);
        bitmap._data |= mask;
    }

    /**
     * @dev Unsets the bit at `index`.
     */
    function unset(BitMap256 storage bitmap, uint256 index) internal {
        uint256 mask = 1 << (index & 0xff);
        bitmap._data &= ~mask;
    }
    /**
     * @dev get member count up to a boundry (not included)
     */
    function memberCountUpTo(BitMap256 memory bitmap, uint256 upTo) internal pure returns (uint256 count){
        count = 0;
        for (uint256 i=0; i<upTo; i++){
            if(get(bitmap, i)){
                count ++;
            }
        }
    }
}