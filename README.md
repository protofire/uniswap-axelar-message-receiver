# Uniswap Axelar Governance Bridge Receiver

This project provides a Hardhat-based environment for developing, testing, and deploying the `UniswapAlexarReceiver` contract. The receiver enforces strict authentication for cross-chain governance actions that originate from a trusted Uniswap Timelock and are routed through Axelar GMP.

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

4. **Run tests**

   ```bash
   npm test
   ```

## Deployment

The deployment script automatically selects constructor arguments based on the active Hardhat network name. Update the entries in `deploymentConfig` inside `scripts/deployReceiver.ts` and `scripts/deploySender.ts` with real data.

```bash
npx hardhat run scripts/deployReceiver.ts --network <destination-network-name>
npx hardhat run scripts/deploySender.ts --network <source-network-name>
```

## Example Usage

After deploying both the sender and receiver contracts, you can initiate a cross-chain governance action from the sender contract. Ensure that the sender contract is whitelisted in the receiver contract to allow it to execute actions. The project has `contracts/MockUniswapV3Factory.sol`. Don't forget update data in `scripts/setupTest.ts` and `scripts/sendEnableFee.ts` accordingly.

```bash
npx hardhat run scripts/deployMockUniswapV3Factory.ts --network <destination-network-name>
npx hardhat run scripts/setupTest.ts --network <destination-network-name>
npx hardhat run scripts/sendEnableFee.ts --network <source-network-name>
```

### Example Kava Testnet to Flow Testnet:

UniswapAlexarSender on Kava Testnet: `0x34695a2d2159602CB2696D45ed5269994eE897C6`

UniswapAlexarReceiver on Flow Testnet: `0xA639F01DAd5A0d7c227b22B0a7AbD64F41eFf0Bb`

MockUniswapV3Factory on Flow Testnet: `0x110Ea7256aA4634Fe02A4358433372691c141242`

Alexar transaction: `https://testnet.axelarscan.io/gmp/0xdf7e5f4bbf7dbc1cd3a4854c73b8bfd4446fc1c0620bf1363bfc6004a174934b`