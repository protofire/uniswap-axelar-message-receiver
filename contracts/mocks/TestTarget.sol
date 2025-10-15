// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

contract TestTarget {
    uint256 public stored;
    event Stored(uint256 value);

    function store(uint256 value) external {
        stored = value;
        emit Stored(value);
    }

    function willRevert() external pure {
        revert("Intentional revert");
    }
}
