// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IUniswapAxelarReceiver {
    event WhitelistedProposalCallerSet(string indexed sourceChain, bytes indexed sourceCaller, bool whitelisted);

    event WhitelistedProposalSenderSet(string indexed sourceChain, string sourceSender, bool whitelisted);

    event ProposalExecuted(bytes32 indexed payloadHash);

    error ProposalExecuteFailed();

    error NotWhitelistedCaller();

    error NotWhitelistedSourceAddress();

    function setWhitelistedProposalSender(
        string calldata sourceChain,
        string calldata sourceSender,
        bool whitelisted
    ) external;

    function setWhitelistedProposalCaller(
        string calldata sourceChain,
        bytes memory sourceCaller,
        bool whitelisted
    ) external;
}