// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { UniswapCalls } from '../lib/UniswapCalls.sol';

interface IUniswapAxelarSender {
    error InvalidFee();

    error InvalidAddress();

    function sendProposals(UniswapCalls.UniswapCall[] memory calls) external payable;

    function sendProposal(
        string calldata destinationChain,
        string calldata destinationContract,
        UniswapCalls.Call[] calldata calls
    ) external payable;
}