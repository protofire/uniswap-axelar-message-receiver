# Uniswap Axelar Governance Bridge Receiver

This project provides a Hardhat-based environment for developing, testing, and deploying the `UniswapAxelarReceiver` contract. The receiver enforces strict authentication for cross-chain governance actions that originate from a trusted Uniswap Timelock and are routed through Axelar GMP.

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

UniswapAxelarSender on Kava Testnet: `https://testnet.kavascan.com/address/0x697d22a4f7c726Cc2721Cbb4318216E562490364?t=code`

UniswapAxelarReceiver on Flow Testnet: `https://evm-testnet.flowscan.io/address/0x4B01ccD6159c0cADC8829188230C91EE03303573?tab=contract`

MockUniswapV3Factory on Flow Testnet: `https://evm-testnet.flowscan.io/address/0xA854AE6bFC969DF574ea990e1489A84CD55073ef?tab=contract`

Axelar transaction: `https://testnet.axelarscan.io/gmp/0x7a19c94f9fba93233298cb995bec79e0cd504c58eade5aa1122345bccb3bd931`