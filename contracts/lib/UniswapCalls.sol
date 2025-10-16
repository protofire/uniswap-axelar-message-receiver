// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library UniswapCalls {
    struct UniswapCall {
        string destinationChain;
        string destinationContract;
        uint256 gas;
        Call[] calls;
    }

    struct Call {
        address target;
        uint256 value;
        bytes callData;
    }
}