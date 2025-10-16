// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IAxelarGateway } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol';
import { IAxelarGasService } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol';
import { IUniswapAxelarSender } from './interfaces/IUniswapAxelarSender.sol';
import { UniswapCalls } from './lib/UniswapCalls.sol';

contract UniswapAxelarSender is IUniswapAxelarSender {
    IAxelarGateway public immutable gateway;
    IAxelarGasService public immutable gasService;

    constructor(address _gateway, address _gasService) {
        if (_gateway == address(0) || _gasService == address(0)) revert InvalidAddress();

        gateway = IAxelarGateway(_gateway);
        gasService = IAxelarGasService(_gasService);
    }

    function sendProposals(UniswapCalls.UniswapCall[] calldata calls) external payable override {
        // revert if the sum of given fees are not equal to the msg.value
        revertIfInvalidFee(calls);

        uint256 length = calls.length;

        for (uint256 i = 0; i < length; ) {
            _sendProposal(calls[i]);
            unchecked {
                ++i;
            }
        }
    }

    function sendProposal(
        string memory destinationChain,
        string memory destinationContract,
        UniswapCalls.Call[] calldata calls
    ) external payable override {
        _sendProposal(UniswapCalls.UniswapCall(destinationChain, destinationContract, msg.value, calls));
    }

    function _sendProposal(UniswapCalls.UniswapCall memory UniswapCall) internal {
        bytes memory payload = abi.encode(abi.encodePacked(msg.sender), UniswapCall.calls);

        if (UniswapCall.gas > 0) {
            gasService.payNativeGasForContractCall{ value: UniswapCall.gas }(
                address(this),
                UniswapCall.destinationChain,
                UniswapCall.destinationContract,
                payload,
                msg.sender
            );
        }

        gateway.callContract(UniswapCall.destinationChain, UniswapCall.destinationContract, payload);
    }

    function revertIfInvalidFee(UniswapCalls.UniswapCall[] calldata calls) private {
        uint256 totalGas = 0;
        uint256 length = calls.length;

        for (uint256 i = 0; i < length; ) {
            totalGas += calls[i].gas;
            unchecked {
                ++i;
            }
        }

        if (totalGas != msg.value) {
            revert InvalidFee();
        }
    }
}