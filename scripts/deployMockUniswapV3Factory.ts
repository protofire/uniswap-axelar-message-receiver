import { ethers, network } from "hardhat";
import type { ContractFactory } from "ethers";
import { MockUniswapV3Factory } from "../typechain-types";
const fs = require('fs');
const path = require('path');

const deploymentConfig = {
  flow: {
    // No specific config needed for MockUniswapV3Factory
  },
  'flow-testnet': {
    // No specific config needed for MockUniswapV3Factory
  },
  'optimism-sepolia': {
    // No specific config needed for MockUniswapV3Factory
  },
  'base-sepolia': {
    // No specific config needed for MockUniswapV3Factory
  },
  'kava-testnet': {
    // No specific config needed for MockUniswapV3Factory
  },
} as const;

type SupportedNetwork = keyof typeof deploymentConfig;

type ConfigEntry = (typeof deploymentConfig)[SupportedNetwork];

function getConfig(name: string): ConfigEntry {
  const key = name as SupportedNetwork;
  const config = deploymentConfig[key];

  if (config === undefined) {
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

  console.log("Deploying MockUniswapV3Factory...");
  console.log(`  Owner will be set to: ${deployer.address}`);
  
  const MockUniswapV3Factory: ContractFactory = await ethers.getContractFactory(
    "MockUniswapV3Factory"
  );

  const factory = await MockUniswapV3Factory.deploy();

  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log(`MockUniswapV3Factory deployed to: ${factoryAddress}`);

  // Get the deployed contract instance with proper typing
  const deployedFactory = MockUniswapV3Factory.attach(factoryAddress) as MockUniswapV3Factory;

  // Prepare deployment data
  const deploymentData = {
    contractAddress: factoryAddress,
    contractName: "MockUniswapV3Factory",
    constructorInputs: [],
    constructorTypes: [],
    network: networkName,
    deployer: deployer.address,
    deploymentTransaction: factory.deploymentTransaction()?.hash,
    blockNumber: (await factory.deploymentTransaction()?.wait())?.blockNumber,
    timestamp: new Date().toISOString(),
    gasUsed: (await factory.deploymentTransaction()?.wait())?.gasUsed?.toString(),
    gasPrice: factory.deploymentTransaction()?.gasPrice?.toString(),
    chainId: (await deployer.provider!.getNetwork()).chainId.toString(),
    abi: MockUniswapV3Factory.interface.fragments.map(f => JSON.parse(f.format("json"))),
  };

  // Write deployment data to JSON file

  const outputDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `MockUniswapV3Factory-${networkName}-${Date.now()}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(deploymentData, null, 2));

  console.log(`Deployment data saved to: ${outputFile}`);

  // Log some additional info about the deployed contract
  console.log("\nContract details:");
  console.log(`Owner: ${await deployedFactory.owner()}`);
  console.log("Default fee amounts and tick spacings:");
  console.log(`  500 (0.05%): ${await deployedFactory.feeAmountTickSpacing(500)}`);
  console.log(`  3000 (0.30%): ${await deployedFactory.feeAmountTickSpacing(3000)}`);
  console.log(`  10000 (1.00%): ${await deployedFactory.feeAmountTickSpacing(10000)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
