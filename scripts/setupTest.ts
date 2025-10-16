import { ethers, network } from "hardhat";
import type { UniswapAxelarReceiver } from "../typechain-types";

// Deployed contract addresses
const UNISWAP_AXELAR_RECEIVER = "0x4B01ccD6159c0cADC8829188230C91EE03303573";
const UNISWAP_AXELAR_SENDER = "0x697d22a4f7c726Cc2721Cbb4318216E562490364";
const MOCK_UNISWAP_V3_FACTORY = "0xA854AE6bFC969DF574ea990e1489A84CD55073ef";

// Cross-chain configuration
const SOURCE_CHAIN = "kava";
const SOURCE_SENDER = UNISWAP_AXELAR_SENDER;

async function main() {
  // Ensure we're running on flow-testnet
  if (network.name !== 'flow-testnet') {
    throw new Error(`This script must be run on flow-testnet, but current network is: ${network.name}`);
  }

  const [owner] = await ethers.getSigners();
  console.log(`Setting up UniswapAxelarReceiver whitelist from: ${owner.address}`);
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
  console.log(`Setting UniswapAxelarReceiver as owner of MockUniswapV3Factory...`);
  const setOwnerTx = await mockFactory.setOwner(UNISWAP_AXELAR_RECEIVER);
  console.log(`Transaction sent: ${setOwnerTx.hash}`);
  await setOwnerTx.wait();
  console.log("✅ Receiver set as owner of MockUniswapV3Factory successfully");
  console.log();

  // Connect to UniswapAxelarReceiver
  const receiver = (await ethers.getContractAt(
    "UniswapAxelarReceiver",
    UNISWAP_AXELAR_RECEIVER
  )) as UniswapAxelarReceiver;

  console.log(`Connected to UniswapAxelarReceiver at: ${await receiver.getAddress()}`);

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
    console.log(`  • Receiver Contract: ${UNISWAP_AXELAR_RECEIVER}`);
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