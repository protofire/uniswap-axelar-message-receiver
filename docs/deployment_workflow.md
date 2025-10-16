# Uniswap Axelar Cross-Chain Governance Bridge - Mainnet Deployment Workflow

## Overview

This document provides a comprehensive guide for deploying the Uniswap Axelar governance bridge contracts to mainnet. The system enables secure cross-chain governance actions between Uniswap Timelock and various blockchain networks through Axelar GMP (General Message Passing).

## Architecture

### Core Contracts

1. **UniswapAxelarReceiver** - Deployed on destination chains
   - Receives and validates cross-chain messages from Axelar
   - Enforces whitelisting for senders and callers
   - Executes Uniswap governance proposals

2. **UniswapAxelarSender** - Deployed on source chains
   - Initiates cross-chain governance proposals
   - Handles gas payment for Axelar network fees

### Key Features

- **Security**: Strict whitelisting prevents unauthorized cross-chain calls
- **Replay Protection**: Command ID tracking prevents duplicate executions
- **Gas Management**: Automatic gas fee calculation and payment
- **Multi-Chain Support**: Compatible with all Axelar-connected chains

## Prerequisites

### Environment Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

   Required variables in `.env`:

   ```bash
   PRIVATE_KEY=your_mainnet_private_key
   MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
   ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
   OPTIMISM_RPC_URL=https://mainnet.optimism.io
   # Add other chain RPC URLs as needed
   ```

3. Ensure sufficient funds on deployment wallet for:
   - Contract deployment costs
   - Axelar gas fees for cross-chain messages

### Network Configuration

Update `hardhat.config.ts` to include mainnet networks:

```typescript
// Add mainnet networks
if (mainnetRpcUrl) {
  networks.mainnet = {
    url: mainnetRpcUrl,
    accounts,
    chainId: 1,
  };
}

if (arbitrumRpcUrl) {
  networks.arbitrum = {
    url: arbitrumRpcUrl,
    accounts,
    chainId: 42161,
  };
}

if (optimismRpcUrl) {
  networks.optimism = {
    url: optimismRpcUrl,
    accounts,
    chainId: 10,
  };
}
```

## Mainnet Deployment Configuration

### Update Deployment Scripts

Add mainnet configurations to `scripts/deployReceiver.ts` and `scripts/deploySender.ts`:

```typescript
const deploymentConfig = {
  // ... existing testnet configs
  mainnet: {
    gateway: "0x4F4495243837681061C4743b74B3eEdf548D56A5",
    gasService: "0x2d5d7d31F671F86C782533cc367F14109a082712",
  },
  arbitrum: {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: "0x2d5d7d31F671F86C782533cc367F14109a082712",
  },
  optimism: {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: "0x2d5d7d31F671F86C782533cc367F14109a082712",
  },
  // Add other mainnet chains as needed
} as const;
```

## Deployment Steps

### Phase 1: Deploy Receiver Contract

Deploy the receiver contract on the destination chain (typically Ethereum mainnet):

```bash
npx hardhat run scripts/deployReceiver.ts --network mainnet
```

**Expected Output:**

- Contract address: `0x...` (save this for sender configuration)
- Deployment transaction hash
- Gas used and cost

**Verification:**

- Check deployment on Etherscan: <https://etherscan.io/address/{contract_address}>
- Verify contract code matches expected bytecode

### Phase 2: Deploy Sender Contract

Deploy the sender contract on the source chain (e.g., Arbitrum):

```bash
npx hardhat run scripts/deploySender.ts --network arbitrum
```

**Expected Output:**

- Contract address: `0x...` (save this for receiver whitelisting)
- Deployment transaction hash
- Gas used and cost

**Verification:**

- Check deployment on Arbiscan: <https://arbiscan.io/address/{contract_address}>

## Post-Deployment Configuration

### Step 1: Whitelist Sender Contract

On the receiver contract, whitelist the sender contract address:

```javascript
// Call on UniswapAxelarReceiver contract
await receiver.setWhitelistedProposalSender(
  "arbitrum",  // source chain name
  "0x...",    // sender contract address
  true
);
```

### Step 2: Whitelist Governance Caller

Whitelist the address that will initiate cross-chain proposals:

```javascript
// Call on UniswapAxelarReceiver contract
await receiver.setWhitelistedProposalCaller(
  "arbitrum",  // source chain name
  "0x...",    // governance/timelock address
  true
);
```

### Step 3: Configure Mock Factory (Optional)

If using MockUniswapV3Factory for testing:

```bash
# Deploy mock factory
npx hardhat run scripts/deployMockUniswapV3Factory.ts --network mainnet

# Set receiver as owner
await mockFactory.setOwner(receiverAddress);
```

## Testing Cross-Chain Functionality

### Test Transaction Flow

1. **Send Proposal from Source Chain:**

   ```javascript
   // On sender contract
   await sender.sendProposal(
     "ethereum",           // destination chain
     receiverAddress,      // receiver contract
     calls,                // UniswapCalls array
     { value: gasAmount }  // gas payment
   );
   ```

2. **Monitor on Axelarscan:**

   - Track transaction: <https://axelarscan.io/gmp/{tx_hash}>
   - Verify execution on destination chain


### Support Resources

- **Axelar Documentation**: <https://docs.axelar.dev/>
- **Axelarscan**: <https://axelarscan.io/>
- **Uniswap Governance**: <https://gov.uniswap.org/>
