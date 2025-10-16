import { ethers, network } from "hardhat";
import type { UniswapAlexarReceiver } from "../typechain-types";

// Deployed contract addresses
const UNISWAP_ALEXAR_RECEIVER = "0xA639F01DAd5A0d7c227b22B0a7AbD64F41eFf0Bb";
const UNISWAP_ALEXAR_SENDER = "0x34695a2d2159602CB2696D45ed5269994eE897C6";
const MOCK_UNISWAP_V3_FACTORY = "0x110Ea7256aA4634Fe02A4358433372691c141242";

// Cross-chain configuration
const SOURCE_CHAIN = "kava";
const SOURCE_SENDER = UNISWAP_ALEXAR_SENDER;

async function main() {
  // Ensure we're running on flow-testnet
  if (network.name !== 'flow-testnet') {
    throw new Error(`This script must be run on flow-testnet, but current network is: ${network.name}`);
  }

  const [owner] = await ethers.getSigners();
  console.log(`Setting up UniswapAlexarReceiver whitelist from: ${owner.address}`);
  console.log(`Account balance: ${ethers.formatEther(await owner.provider!.getBalance(owner.address))} ETH`);
  console.log(`Network: ${network.name}`);
  console.log();

  // Get the Mock Uniswap V3 Factory contract
  const mockFactory = await ethers.getContractAt(
    "MockUniswapV3Factory",
    MOCK_UNISWAP_V3_FACTORY
  );

  console.log(`Connected to MockUniswapV3Factory at: ${await mockFactory.getAddress()}`);

  // Set the receiver as the owner for the mock factory
  console.log(`Setting UniswapAlexarReceiver as owner of MockUniswapV3Factory...`);
  const setOwnerTx = await mockFactory.setOwner(UNISWAP_ALEXAR_RECEIVER);
  console.log(`Transaction sent: ${setOwnerTx.hash}`);
  await setOwnerTx.wait();
  console.log("✅ Receiver set as owner of MockUniswapV3Factory successfully");
  console.log();

  // Connect to UniswapAlexarReceiver
  const receiver = (await ethers.getContractAt(
    "UniswapAlexarReceiver",
    UNISWAP_ALEXAR_RECEIVER
  )) as UniswapAlexarReceiver;

  console.log(`Connected to UniswapAlexarReceiver at: ${await receiver.getAddress()}`);

  try {
    // Check current owner
    const currentOwner = await receiver.owner();
    console.log(`Current owner: ${currentOwner}`);
    
    if (currentOwner.toLowerCase() !== owner.address.toLowerCase()) {
      throw new Error(`You are not the owner of the receiver contract. Owner: ${currentOwner}, Your address: ${owner.address}`);
    }

    console.log("✅ You are the owner of the receiver contract");
    console.log();

    // 1. Whitelist the sender contract
    console.log(`Setting up whitelisted sender:`);
    console.log(`  Source Chain: ${SOURCE_CHAIN}`);
    console.log(`  Source Sender: ${SOURCE_SENDER}`);

    const tx1 = await receiver.setWhitelistedProposalSender(
      SOURCE_CHAIN,
      SOURCE_SENDER,
      true
    );

    console.log(`Transaction sent: ${tx1.hash}`);
    await tx1.wait();
    console.log("✅ Sender whitelisted successfully");

    // 2. Whitelist the caller (the account that calls sendProposal)
    // This should be the address that will call the sender contract
    const callerAddress = owner.address; // Using the same address, but this could be different

    // bytes memory payload = abi.encode(abi.encodePacked(msg.sender), UniswapCall.calls);
    // const callerBytes = ethers.solidityPacked(["address"], [callerAddress]);

    console.log();
    console.log(`Setting up whitelisted caller:`);
    console.log(`  Source Chain: ${SOURCE_CHAIN}`);
    console.log(`  Source Caller: ${callerAddress}`);
    console.log(`  Caller: ${callerAddress}`);

    const tx2 = await receiver.setWhitelistedProposalCaller(
      SOURCE_CHAIN,
      callerAddress,
      true
    );

    console.log(`Transaction sent: ${tx2.hash}`);
    await tx2.wait();
    console.log("✅ Caller whitelisted successfully");

    console.log();
    console.log("🎉 Setup completed successfully!");
    console.log();
    console.log("📋 Configuration Summary:");
    console.log(`  • Receiver Contract: ${UNISWAP_ALEXAR_RECEIVER}`);
    console.log(`  • Whitelisted Sender: ${SOURCE_SENDER} on ${SOURCE_CHAIN}`);
    console.log(`  • Whitelisted Caller: ${callerAddress} on ${SOURCE_CHAIN}`);
    console.log();
    console.log("✅ The receiver is now ready to accept cross-chain messages from the sender!");
  } catch (error) {
    console.error("❌ Error setting up receiver:");
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