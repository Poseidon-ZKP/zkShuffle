// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract HiLoToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("ZKHiLo Token", "ZKT") {
        _mint(msg.sender, initialSupply);
    }

    function faucet() external {
        _mint(msg.sender, 10000 * 1e18);
    }
}
