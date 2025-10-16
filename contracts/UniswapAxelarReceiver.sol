// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/Ownable.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IGovernable.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IOwnable.sol";
import "./interfaces/IUniswapAxelarReceiver.sol";
import "./lib/UniswapCalls.sol";

contract UniswapAxelarReceiver is
    IUniswapAxelarReceiver,
    AxelarExecutable,
    Ownable {
    mapping(bytes32 => bool) public processedCommands;

    mapping(string => mapping(bytes => bool)) public whitelistedCallers;

    mapping(string => mapping(string => bool)) public whitelistedSenders;

    constructor(
        address gatewayAddress,
        address _owner
    ) AxelarExecutable(gatewayAddress) Ownable(_owner) {
        require(gatewayAddress != address(0), "Invalid gateway");
    }

    function _execute(
        bytes32 commandId,
        string calldata sourceChain_,
        string calldata sourceAddress_,
        bytes calldata payload
    ) internal override {
        _validateSource(commandId, sourceChain_, sourceAddress_);

        processedCommands[commandId] = true;

        (bytes memory sourceCaller, UniswapCalls.Call[] memory calls) = abi
            .decode(payload, (bytes, UniswapCalls.Call[]));

        if (!whitelistedCallers[sourceChain_][sourceCaller]) {
            revert NotWhitelistedCaller();
        }

        _executeProposal(calls);

        emit ProposalExecuted(
            keccak256(
                abi.encode(sourceChain_, sourceAddress_, sourceCaller, payload)
            )
        );
    }

    function _validateSource(
        bytes32 commandId,
        string calldata sourceChain_,
        string calldata sourceAddress_
    ) private view {
        if (!whitelistedSenders[sourceChain_][sourceAddress_]) {
            revert NotWhitelistedSourceAddress();
        }
        require(!processedCommands[commandId], "Command replay");
    }

    function setWhitelistedProposalCaller(
        string calldata sourceChain,
        bytes memory sourceCaller,
        bool whitelisted
    ) external onlyOwner {
        whitelistedCallers[sourceChain][abi.encodePacked(sourceCaller)] = whitelisted;
        emit WhitelistedProposalCallerSet(
            sourceChain,
            sourceCaller,
            whitelisted
        );
    }

    function setWhitelistedProposalSender(
        string calldata sourceChain,
        string calldata sourceSender,
        bool whitelisted
    ) external onlyOwner {
        whitelistedSenders[sourceChain][sourceSender] = whitelisted;
        emit WhitelistedProposalSenderSet(
            sourceChain,
            sourceSender,
            whitelisted
        );
    }

    receive() external payable {}

    function _executeProposal(UniswapCalls.Call[] memory calls) internal {
        uint256 length = calls.length;

        for (uint256 i = 0; i < length; i++) {
            UniswapCalls.Call memory call = calls[i];
            (bool success, bytes memory result) = call.target.call{
                value: call.value
            }(call.callData);

            if (!success) {
                _onTargetExecutionFailed(call, result);
            }
        }
    }

    function _onTargetExecutionFailed(
        UniswapCalls.Call memory /* call */,
        bytes memory result
    ) internal virtual {
        if (result.length > 0) {
            assembly {
                revert(add(32, result), mload(result))
            }
        } else {
            revert ProposalExecuteFailed();
        }
    }
}
