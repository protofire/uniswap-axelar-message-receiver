import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256 } from "ethers";

const abiCoder = ethers.AbiCoder.defaultAbiCoder();
const VERSION_HASH = keccak256(
  abiCoder.encode(
    ["string"],
    ["UniswapAxelarGovernanceV1(uint64 proposalId,address[] targets,uint256[] values,bytes[] calldatas)"]
  )
);

const TRUSTED_CHAIN = "Sepolia";
const TRUSTED_ADDRESS = "0xUniswapGovernanceAddress";

describe("UniswapAlexarMessageReceiver", () => {
  async function deployFixture() {
    const [deployer] = await ethers.getSigners();

    const Gateway = await ethers.getContractFactory("MockAxelarGateway");
    const Target = await ethers.getContractFactory("TestTarget");
    const Receiver = await ethers.getContractFactory("UniswapAlexarMessageReceiver");

    const gateway = await Gateway.deploy();
    const target = await Target.deploy();
    const receiver = await Receiver.deploy(await gateway.getAddress());

    return { deployer, gateway, target, receiver };
  }

  function encodePayload(data: {
    proposalId: bigint;
    targets: string[];
    values: bigint[];
    calldatas: string[];
  }) {
    return abiCoder.encode(
      ["tuple(bytes32 version,uint64 proposalId,address[] targets,uint256[] values,bytes[] calldatas)"],
      [
        {
          version: VERSION_HASH,
          proposalId: data.proposalId,
          targets: data.targets,
          values: data.values,
          calldatas: data.calldatas
        }
      ]
    );
  }

  async function approve(
    gateway: any,
    commandId: string,
    sourceChain: string,
    sourceAddress: string,
    payload: string
  ) {
    await gateway.approveContractCall(commandId, sourceChain, sourceAddress, payload);
  }

  it("executes a governance payload successfully", async () => {
    const { gateway, target, receiver } = await deployFixture();

    const proposalId = 1n;
    const callData = target.interface.encodeFunctionData("store", [42n]);
    const payload = encodePayload({
      proposalId,
      targets: [await target.getAddress()],
      values: [0n],
      calldatas: [callData]
    });

    const commandId = ethers.hexlify(ethers.randomBytes(32));
    await approve(gateway, commandId, TRUSTED_CHAIN, TRUSTED_ADDRESS, payload);

    await expect(
      gateway.execute(receiver, commandId, TRUSTED_CHAIN, TRUSTED_ADDRESS, payload)
    )
      .to.emit(receiver, "GovernanceActionExecuted")
      .withArgs(commandId, proposalId, TRUSTED_CHAIN, TRUSTED_ADDRESS, [await target.getAddress()]);

    expect(await receiver.latestProposalId()).to.equal(proposalId);
    expect(await receiver.processedCommands(commandId)).to.equal(true);
    expect(await target.stored()).to.equal(42n);
  });

  it("reverts for untrusted chain", async () => {
    const { gateway, receiver, target } = await deployFixture();
    const payload = encodePayload({
      proposalId: 1n,
      targets: [await target.getAddress()],
      values: [0n],
      calldatas: [target.interface.encodeFunctionData("store", [1n])]
    });
    const commandId = ethers.hexlify(ethers.randomBytes(32));
    await approve(gateway, commandId, "Polygon", TRUSTED_ADDRESS, payload);

    await expect(
      gateway.execute(receiver, commandId, "Polygon", TRUSTED_ADDRESS, payload)
    ).to.be.revertedWith("Untrusted source chain");
  });

  it("blocks replayed command IDs", async () => {
    const { gateway, receiver, target } = await deployFixture();
    const commandId = ethers.hexlify(ethers.randomBytes(32));
    const payload = encodePayload({
      proposalId: 1n,
      targets: [await target.getAddress()],
      values: [0n],
      calldatas: [target.interface.encodeFunctionData("store", [1n])]
    });

    await approve(gateway, commandId, TRUSTED_CHAIN, TRUSTED_ADDRESS, payload);
    await gateway.execute(receiver, commandId, TRUSTED_CHAIN, TRUSTED_ADDRESS, payload);

    await expect(
      gateway.execute(receiver, commandId, TRUSTED_CHAIN, TRUSTED_ADDRESS, payload)
    ).to.be.revertedWith("Command replay");
  });

  it("reverts when payload version mismatches", async () => {
    const { gateway, receiver, target } = await deployFixture();
    const coder = ethers.AbiCoder.defaultAbiCoder();
    const payload = coder.encode(
      ["tuple(bytes32 version,uint64 proposalId,address[] targets,uint256[] values,bytes[] calldatas)"],
      [
        {
          version: ethers.ZeroHash,
          proposalId: 1n,
          targets: [await target.getAddress()],
          values: [0n],
          calldatas: [target.interface.encodeFunctionData("store", [1n])]
        }
      ]
    );
    const commandId = ethers.hexlify(ethers.randomBytes(32));
    await approve(gateway, commandId, TRUSTED_CHAIN, TRUSTED_ADDRESS, payload);

    await expect(
      gateway.execute(receiver, commandId, TRUSTED_CHAIN, TRUSTED_ADDRESS, payload)
    ).to.be.revertedWith("Invalid payload version");
  });

  it("reverts when target call fails", async () => {
    const { gateway, receiver, target } = await deployFixture();
    const proposalId = 1n;
    const callData = target.interface.encodeFunctionData("willRevert");
    const payload = encodePayload({
      proposalId,
      targets: [await target.getAddress()],
      values: [0n],
      calldatas: [callData]
    });
    const commandId = ethers.hexlify(ethers.randomBytes(32));
    await approve(gateway, commandId, TRUSTED_CHAIN, TRUSTED_ADDRESS, payload);

    await expect(
      gateway.execute(receiver, commandId, TRUSTED_CHAIN, TRUSTED_ADDRESS, payload)
    ).to.be.revertedWith("Intentional revert");
  });

  it("reverts when any call specifies a non-zero value", async () => {
    const { gateway, receiver, target } = await deployFixture();
    const payload = encodePayload({
      proposalId: 1n,
      targets: [await target.getAddress()],
      values: [1n],
      calldatas: [target.interface.encodeFunctionData("store", [1n])]
    });
    const commandId = ethers.hexlify(ethers.randomBytes(32));
    await approve(gateway, commandId, TRUSTED_CHAIN, TRUSTED_ADDRESS, payload);

    await expect(
      gateway.execute(receiver, commandId, TRUSTED_CHAIN, TRUSTED_ADDRESS, payload)
    ).to.be.revertedWith("Non-zero value unsupported");
  });
});