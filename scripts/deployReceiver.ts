import { ethers, network } from "hardhat";
import type { ContractFactory } from "ethers";
const fs = require('fs');
const path = require('path');

const deploymentConfig = {
  flow: {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
  },
  'optimism-sepolia': {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
  },
  'base-sepolia': {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
  },
  'kava-testnet': {
    gateway: "0xC8D18F85cB0Cee5C95eC29c69DeaF6cea972349c",
  },
} as const;

type SupportedNetwork = keyof typeof deploymentConfig;

type ConfigEntry = (typeof deploymentConfig)[SupportedNetwork];

function getConfig(name: string): ConfigEntry {
  const key = name as SupportedNetwork;
  const config = deploymentConfig[key];

  if (!config) {
    throw new Error(`No deployment config found for network '${name}'`);
  }

  return config;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  const config = getConfig(networkName);

  console.log(`Deploying contracts with the account: ${deployer.address}`);
  console.log(`Account balance: ${(await deployer.provider!.getBalance(deployer.address)).toString()}`);
  console.log(`Deploying to network: ${networkName}`);

  console.log("Deploying UniswapAlexarMessageReceiver with args:");
  console.log(`  Gateway: ${config.gateway}`);
  
  const UniswapAlexarMessageReceiver: ContractFactory = await ethers.getContractFactory(
    "UniswapAlexarMessageReceiver"
  );

  const receiver = await UniswapAlexarMessageReceiver.deploy(
    config.gateway,
  );

  await receiver.waitForDeployment();
  const receiverAddress = await receiver.getAddress();

  console.log(`UniswapAlexarMessageReceiver deployed to: ${receiverAddress}`);

  // Prepare deployment data
  const deploymentData = {
    contractAddress: receiverAddress,
    contractName: "UniswapAlexarMessageReceiver",
    constructorInputs: [config.gateway],
    constructorTypes: ["address"],
    network: networkName,
    deployer: deployer.address,
    deploymentTransaction: receiver.deploymentTransaction()?.hash,
    blockNumber: (await receiver.deploymentTransaction()?.wait())?.blockNumber,
    timestamp: new Date().toISOString(),
    gasUsed: (await receiver.deploymentTransaction()?.wait())?.gasUsed?.toString(),
    gasPrice: receiver.deploymentTransaction()?.gasPrice?.toString(),
    chainId: (await deployer.provider!.getNetwork()).chainId.toString(),
    compilerVersion: "hardhat", // You may want to get actual compiler version
    optimization: true,
    optimizationRuns: 200,
    inputJson: {
      language: "Solidity",
      sources: {
        "contracts/UniswapAlexarMessageReceiver.sol": {
          content: fs.readFileSync(path.join(__dirname, "../contracts/UniswapAlexarMessageReceiver.sol"), "utf8")
        }
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"]
          }
        }
      }
    },
    abi: UniswapAlexarMessageReceiver.interface.fragments.map(f => f.format("json")).map(JSON.parse),
    bytecode: UniswapAlexarMessageReceiver.bytecode,
    deployedBytecode: await deployer.provider!.getCode(receiverAddress)
  };

  // Write deployment data to JSON file

  const outputDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `UniswapAlexarMessageReceiver-${networkName}-${Date.now()}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(deploymentData, null, 2));

  console.log(`Deployment data saved to: ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
