// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract UniswapAlexarMessageReceiver is AxelarExecutable {
    using Address for address;

    /// @dev Hash of the payload layout expected from the governance sender.
    bytes32 public constant GOVERNANCE_PAYLOAD_VERSION =
        keccak256(
            abi.encode(
                "UniswapAxelarGovernanceV1(uint64 proposalId,address[] targets,uint256[] values,bytes[] calldatas)"
            )
        );

    /// @notice Axelar chain identifier that is authorised to send governance messages.
    string public constant trustedSourceChain = "Sepolia";

    /// @notice Axelar gateway-registered address on the trusted source chain.
    string public constant trustedSourceAddress = "0xUniswapGovernanceAddress";

    /// @notice Records whether a given Axelar command has already been processed.
    mapping(bytes32 => bool) public processedCommands;

    /// @notice ID of the most recently executed governance proposal.
    uint64 public latestProposalId;

    /// @notice Emitted after a governance payload is executed successfully.
    event GovernanceActionExecuted(
        bytes32 commandId,
        uint64 proposalId,
        string sourceChain,
        string sourceAddress,
        address[] targets
    );

    /// @notice Emitted when execution of a governance payload reverts.
    event GovernanceActionFailed(
        bytes32 commandId,
        uint64 proposalId,
        address target,
        bytes data,
        bytes revertData
    );

    struct GovernancePayload {
        bytes32 version;
        uint64 proposalId;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
    }

    constructor(address gatewayAddress) AxelarExecutable(gatewayAddress) {
        require(gatewayAddress != address(0), "Invalid gateway");
    }

    /**
     * @notice Internal hook triggered by the Axelar gateway after validating a message.
     */
    function _execute(
        bytes32 commandId,
        string calldata sourceChain_,
        string calldata sourceAddress_,
        bytes calldata payload
    ) internal override {
        _validateSource(commandId, sourceChain_, sourceAddress_);

        GovernancePayload memory message = abi.decode(
            payload,
            (GovernancePayload)
        );
        _validatePayload(message);

        // Update state before performing external calls to guard against re-entrancy on proposalId.
        latestProposalId = message.proposalId;
        processedCommands[commandId] = true;

        // Execute each governance action atomically; any failure reverts the whole batch.
        uint256 length = message.targets.length;
        for (uint256 i = 0; i < length; ) {
            address target = message.targets[i];
            uint256 value = message.values[i];
            bytes memory callData = message.calldatas[i];

            // Axelar GMP delivers no native value. Enforce zero to prevent misconfiguration.
            if (value != 0) revert("Non-zero value unsupported");

            (bool success, bytes memory returnData) = target.call{value: value}(
                callData
            );
            if (!success) {
                emit GovernanceActionFailed(
                    commandId,
                    message.proposalId,
                    target,
                    callData,
                    returnData
                );
                _revertWith(returnData);
            }

            unchecked {
                ++i;
            }
        }

        emit GovernanceActionExecuted(
            commandId,
            message.proposalId,
            sourceChain_,
            sourceAddress_,
            message.targets
        );
    }

    /// @dev Confirms the message originates from the configured Axelar sender and is not replayed.
    function _validateSource(
        bytes32 commandId,
        string calldata sourceChain_,
        string calldata sourceAddress_
    ) private view {
        require(
            keccak256(bytes(sourceChain_)) ==
                keccak256(bytes(trustedSourceChain)),
            "Untrusted source chain"
        );
        require(
            keccak256(bytes(sourceAddress_)) ==
                keccak256(bytes(trustedSourceAddress)),
            "Untrusted source address"
        );
        require(!processedCommands[commandId], "Command replay");
    }

    /// @dev Checks payload metadata and array alignment.
    function _validatePayload(GovernancePayload memory message) private pure {
        require(
            message.version == GOVERNANCE_PAYLOAD_VERSION,
            "Invalid payload version"
        );

        uint256 targetsLength = message.targets.length;
        require(
            targetsLength == message.values.length &&
                targetsLength == message.calldatas.length,
            "Array length mismatch"
        );
    }

    /// @dev Bubble up a revert reason if present; otherwise revert with a generic message.
    function _revertWith(bytes memory revertData) private pure {
        if (revertData.length > 0) {
            // solhint-disable-next-line no-inline-assembly
            assembly {
                revert(add(revertData, 0x20), mload(revertData))
            }
        }
        revert("Governance call reverted");
    }
}
