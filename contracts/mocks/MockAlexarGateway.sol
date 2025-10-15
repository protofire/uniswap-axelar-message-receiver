// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "../UniswapAlexarMessageReceiver.sol";

contract MockAxelarGateway {
    mapping(bytes32 => bool) private approvals;

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
        return
            approvals[_key(commandId, sourceChain, sourceAddress, payloadHash)];
    }

    function execute(
        UniswapAlexarMessageReceiver receiver,
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) external {
        receiver.execute(commandId, sourceChain, sourceAddress, payload);
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
