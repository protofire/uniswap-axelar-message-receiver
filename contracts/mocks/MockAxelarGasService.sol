// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockAxelarGasService {
    event NativeGasPaidForContractCall(
        address indexed sourceAddress,
        string destinationChain,
        string destinationAddress,
        bytes payload,
        uint256 gas,
        address refundAddress
    );

    function payNativeGasForContractCall(
        address sender,
        string calldata destinationChain,
        string calldata destinationAddress,
        bytes calldata payload,
        address refundAddress
    ) external payable {
        emit NativeGasPaidForContractCall(
            sender,
            destinationChain,
            destinationAddress,
            payload,
            msg.value,
            refundAddress
        );
    }
}