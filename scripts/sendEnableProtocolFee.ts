import { ethers, network } from "hardhat";
import type { UniswapAxelarSender } from "../typechain-types";

// Deployed contract addresses
const CONTRACTS = {
  'kava-testnet': {
    UniswapAxelarSender: "0x697d22a4f7c726Cc2721Cbb4318216E562490364",
  },
  'flow-testnet': {
    UniswapAxelarReceiver: "0xBFF1beFf3E887D7978c451D617cc64f3b3B92676",
    UniswapV3Pool: "0xEFCe8D66bAe5C9091fcAB34DD68449056588A71E" // WFLOW <> USDF - 0.30%
  }
} as const;

// Cross-chain parameters
const DESTINATION_CHAIN = "flow";
const DESTINATION_CONTRACT = CONTRACTS['flow-testnet'].UniswapAxelarReceiver;
const TARGET_CONTRACT = CONTRACTS['flow-testnet'].UniswapV3Pool;

// Fee parameters to enable
const FEE_PROTOCOL_0 = 4;
const FEE_PROTOCOL_1 = 4;

async function main() {
  // Ensure we're running on kava-testnet
  if (network.name !== 'kava-testnet') {
    throw new Error(`This script must be run on kava-testnet, but current network is: ${network.name}`);
  }

  const [sender] = await ethers.getSigners();
  console.log(`Sending cross-chain setFeeProtocol transaction from: ${sender.address}`);
  console.log(`Account balance: ${ethers.formatEther(await sender.provider!.getBalance(sender.address))} ETH`);
  console.log(`Network: ${network.name}`);
  console.log();

  // Connect to UniswapAxelarSender on kava-testnet
  const uniswapAxelarSender = (await ethers.getContractAt(
    "UniswapAxelarSender",
    CONTRACTS['kava-testnet'].UniswapAxelarSender
  )) as UniswapAxelarSender;

  console.log(`Connected to UniswapAxelarSender at: ${await uniswapAxelarSender.getAddress()}`);

  // Prepare the call data for setFeeProtocol on UniswapV3Pool
  const uniswapV3PoolInterface = new ethers.Interface([
    "function setFeeProtocol(uint8 feeProtocol0, uint8 feeProtocol1)"
  ]);

  const callData = uniswapV3PoolInterface.encodeFunctionData("setFeeProtocol", [
    FEE_PROTOCOL_0,
    FEE_PROTOCOL_1
  ]);

  console.log(`Preparing cross-chain call:`);
  console.log(`  Destination Chain: ${DESTINATION_CHAIN}`);
  console.log(`  Destination Contract (Receiver): ${DESTINATION_CONTRACT}`);
  console.log(`  Target Contract (UniswapV3Pool): ${TARGET_CONTRACT}`);
  console.log(`  Function: setFeeProtocol(${FEE_PROTOCOL_0}, ${FEE_PROTOCOL_1})`);
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
    console.log("Sending cross-chain setFeeProtocol proposal...");

    const tx = await uniswapAxelarSender.sendProposal(
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

    console.log("✅ Cross-chain setFeeProtocol proposal sent successfully!");
    console.log();
    console.log("📋 Summary:");
    console.log(`  • Sender Network: kava-testnet`);
    console.log(`  • Receiver Network: ${DESTINATION_CHAIN}`);
    console.log(`  • Receiver Contract: ${DESTINATION_CONTRACT}`);
    console.log(`  • New Protocol Fee 0: ${FEE_PROTOCOL_0}`);
    console.log(`  • New Protocol Fee 1: ${FEE_PROTOCOL_1}`);
    console.log(`  • Transaction Hash: ${tx.hash}`);
    console.log();
    console.log("⏳ The cross-chain message will be processed by Axelar Network.");
    console.log("   You can monitor the transaction status on Axelar's explorer:");
    console.log(`   https://testnet.axelarscan.io/gmp/${tx.hash}`);
    console.log();
    console.log("🔍 To verify the fee was enabled on flow-testnet, you can call:");
    console.log(`   UniswapV3Pool.slot0()`);
    console.log(`   Expected result: slot0.feeProtocol should not be 0`);

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
