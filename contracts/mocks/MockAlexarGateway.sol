// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../UniswapAlexarReceiver.sol";

contract MockAxelarGateway {
    mapping(bytes32 => bool) private approvals;
    mapping(bytes32 => bool) private executed;

    // Event to emit when a contract call is made
    event ContractCall(
        address indexed sender,
        string destinationChain,
        string destinationContract,
        bytes32 payloadHash,
        bytes payload
    );

    function approveContractCall(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) external {
        bytes32 payloadHash = keccak256(payload);
        approvals[
            _key(commandId, sourceChain, sourceAddress, payloadHash)
        ] = true;
    }

    function validateContractCall(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes32 payloadHash
    ) external view returns (bool) {
        bytes32 key = _key(commandId, sourceChain, sourceAddress, payloadHash);
        if (approvals[key]) {
            return true;
        }
        return false;
    }

    function isCommandExecuted(bytes32 commandId) external view returns (bool) {
        return executed[commandId];
    }

    function execute(
        UniswapAlexarReceiver receiver,
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) external {
        receiver.execute(commandId, sourceChain, sourceAddress, payload);
    }

    // Add callContract function for UniswapAlexarSender
    function callContract(
        string calldata destinationChain,
        string calldata destinationContract,
        bytes calldata payload
    ) external {
        // Emit event for testing with proper arguments
        emit ContractCall(
            msg.sender,
            destinationChain,
            destinationContract,
            keccak256(payload),
            payload
        );
    }

    function _key(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes32 payloadHash
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(commandId, sourceChain, sourceAddress, payloadHash)
            );
    }
}
