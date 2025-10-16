import { ethers, network } from "hardhat";
import type { ContractFactory } from "ethers";
const fs = require('fs');
const path = require('path');

const deploymentConfig = {
  flow: {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
  },
  'optimism-sepolia': {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
  },
  'base-sepolia': {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
  },
  'kava-testnet': {
    gateway: "0xC8D18F85cB0Cee5C95eC29c69DeaF6cea972349c",
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
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

  console.log("Deploying UniswapAlexarSender with args:");
  console.log(`  Gateway: ${config.gateway}`);
  console.log(`  Gas Service: ${config.gasService}`);
  
  const UniswapAlexarSender: ContractFactory = await ethers.getContractFactory(
    "UniswapAlexarSender"
  );

  const sender = await UniswapAlexarSender.deploy(
    config.gateway,
    config.gasService
  );

  await sender.waitForDeployment();
  const senderAddress = await sender.getAddress();

  console.log(`UniswapAlexarSender deployed to: ${senderAddress}`);

  // Prepare deployment data
  const deploymentData = {
    contractAddress: senderAddress,
    contractName: "UniswapAlexarSender",
    constructorInputs: [config.gateway, config.gasService],
    constructorTypes: ["address", "address"],
    network: networkName,
    deployer: deployer.address,
    deploymentTransaction: sender.deploymentTransaction()?.hash,
    blockNumber: (await sender.deploymentTransaction()?.wait())?.blockNumber,
    timestamp: new Date().toISOString(),
    gasUsed: (await sender.deploymentTransaction()?.wait())?.gasUsed?.toString(),
    gasPrice: sender.deploymentTransaction()?.gasPrice?.toString(),
    chainId: (await deployer.provider!.getNetwork()).chainId.toString(),
    abi: UniswapAlexarSender.interface.fragments.map(f => JSON.parse(f.format("json"))),
  };

  // Write deployment data to JSON file

  const outputDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `UniswapAlexarSender-${networkName}-${Date.now()}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(deploymentData, null, 2));

  console.log(`Deployment data saved to: ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
