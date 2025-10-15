# Uniswap Axelar Governance Bridge Receiver

This project provides a Hardhat-based environment for developing, testing, and deploying the `UniswapAlexarMessageReceiver` contract. The receiver enforces strict authentication for cross-chain governance actions that originate from a trusted Uniswap Timelock and are routed through Axelar GMP.

Supporting files include `hardhat.config.ts`, `tsconfig.json`, `.env.example`, and `package.json` with all required dependencies.

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   # Fill in PRIVATE_KEY, RPC URLs, and Polygonscan API key as needed
   ```

3. **Compile contracts**

   ```bash
   npm run build
   ```

## TODO
4. **Run tests**

   ```bash
   npm test
   ```

## Deployment

The deployment script automatically selects constructor arguments based on the active Hardhat network name. Update the entries in `deploymentConfig` inside `scripts/deployReceiver.ts` with real gateway and timelock addresses before deploying.

```bash
npx hardhat run scripts/deployReceiver.ts --network <network-name>
```

## Verify Receiver on Block Explorer

After deployment, verify the contract on the relevant block explorer (e.g., Polygonscan) using:

```bash
npx hardhat verify --network <network-name> <DEPLOYED_CONTRACT_ADDRESS> <GATEWAY_ADDRESS>
```
