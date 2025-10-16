import { ethers, network } from "hardhat";
import type { UniswapAlexarSender } from "../typechain-types";

// Deployed contract addresses
const CONTRACTS = {
  'kava-testnet': {
    UniswapAlexarSender: "0x34695a2d2159602CB2696D45ed5269994eE897C6",
  },
  'flow-testnet': {
    UniswapAlexarReceiver: "0xA639F01DAd5A0d7c227b22B0a7AbD64F41eFf0Bb",
    MockUniswapV3Factory: "0x110Ea7256aA4634Fe02A4358433372691c141242",
  },
  'base-sepolia': {
    UniswapAlexarReceiver: "0xCeF7109625A6C360dF530149159491b87CC33C2d",
    MockUniswapV3Factory: "0x2ceE2B4d550024374fCacBC1677088d550B96Fe7", // Replace with actual address if deployed
  },
} as const;

// Cross-chain parameters
const DESTINATION_CHAIN = "flow";
const DESTINATION_CONTRACT = CONTRACTS['flow-testnet'].UniswapAlexarReceiver;
const TARGET_CONTRACT = CONTRACTS['flow-testnet'].MockUniswapV3Factory;

// Fee parameters to enable (example: 1% fee with tick spacing of 200)
const NEW_FEE = 505; // 1% = 10000 (in basis points, where 100% = 1000000)
const TICK_SPACING = 10;

async function main() {
  // Ensure we're running on kava-testnet
  if (network.name !== 'kava-testnet') {
    throw new Error(`This script must be run on kava-testnet, but current network is: ${network.name}`);
  }

  const [sender] = await ethers.getSigners();
  console.log(`Sending cross-chain enableFeeAmount transaction from: ${sender.address}`);
  console.log(`Account balance: ${ethers.formatEther(await sender.provider!.getBalance(sender.address))} ETH`);
  console.log(`Network: ${network.name}`);
  console.log();

  // Connect to UniswapAlexarSender on kava-testnet
  const uniswapAlexarSender = (await ethers.getContractAt(
    "UniswapAlexarSender",
    CONTRACTS['kava-testnet'].UniswapAlexarSender
  )) as UniswapAlexarSender;

  console.log(`Connected to UniswapAlexarSender at: ${await uniswapAlexarSender.getAddress()}`);

  // Prepare the call data for enableFeeAmount on MockUniswapV3Factory
  const mockFactoryInterface = new ethers.Interface([
    "function enableFeeAmount(uint24 fee, int24 tickSpacing)"
  ]);

  const callData = mockFactoryInterface.encodeFunctionData("enableFeeAmount", [
    NEW_FEE,
    TICK_SPACING
  ]);

  console.log(`Preparing cross-chain call:`);
  console.log(`  Destination Chain: ${DESTINATION_CHAIN}`);
  console.log(`  Destination Contract (Receiver): ${DESTINATION_CONTRACT}`);
  console.log(`  Target Contract (MockUniswapV3Factory): ${TARGET_CONTRACT}`);
  console.log(`  Function: enableFeeAmount(${NEW_FEE}, ${TICK_SPACING})`);
  console.log(`  Call Data: ${callData}`);
  console.log();

  // Prepare the call structure
  const calls = [
    {
      target: TARGET_CONTRACT,
      value: 0, // No ETH value needed
      callData: callData
    }
  ];

  // Estimate gas for cross-chain call (you may need to adjust this)
  const gasAmount = ethers.parseEther("0.5"); // 0.01 ETH for gas

  console.log(`Estimated gas for cross-chain call: ${ethers.formatEther(gasAmount)} ETH`);

  try {
    // Send the cross-chain proposal
    console.log("Sending cross-chain enableFeeAmount proposal...");
    
    const tx = await uniswapAlexarSender.sendProposal(
      DESTINATION_CHAIN,
      DESTINATION_CONTRACT,
      calls,
      {
        value: gasAmount, // Pay for cross-chain gas
      }
    );

    console.log(`Transaction sent! Hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block: ${receipt?.blockNumber}`);
    console.log(`Gas used: ${receipt?.gasUsed.toString()}`);
    console.log();

    console.log("✅ Cross-chain enableFeeAmount proposal sent successfully!");
    console.log();
    console.log("📋 Summary:");
    console.log(`  • Sender Network: kava-testnet`);
    console.log(`  • Receiver Network: ${DESTINATION_CHAIN}`);
    console.log(`  • Receiver Contract: ${DESTINATION_CONTRACT}`);
    console.log(`  • New Fee Tier: ${NEW_FEE} (${NEW_FEE / 10000}%)`);
    console.log(`  • Tick Spacing: ${TICK_SPACING}`);
    console.log(`  • Transaction Hash: ${tx.hash}`);
    console.log();
    console.log("⏳ The cross-chain message will be processed by Axelar Network.");
    console.log("   You can monitor the transaction status on Axelar's explorer:");
    console.log(`   https://testnet.axelarscan.io/gmp/${tx.hash}`);
    console.log();
    console.log("🔍 To verify the fee was enabled on flow-testnet, you can call:");
    console.log(`   MockUniswapV3Factory.feeAmountTickSpacing(${NEW_FEE})`);
    console.log(`   Expected result: ${TICK_SPACING}`);

  } catch (error) {
    console.error("❌ Error sending cross-chain proposal:");
    console.error(error);
    throw error;
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
