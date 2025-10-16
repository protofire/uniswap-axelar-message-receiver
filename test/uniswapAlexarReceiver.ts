import { expect } from 'chai';
import { ethers } from 'hardhat';
import { keccak256 } from 'ethers';
import { Signer } from 'ethers';
import { UniswapAlexarSender__factory } from "../typechain-types";

const abiCoder = ethers.AbiCoder.defaultAbiCoder();

describe('UniswapAlexarReceiver', function () {
  // Constants for testing
  const SOURCE_CHAIN = 'ethereum';
  const SOURCE_ADDRESS = '0x' + '1'.repeat(40);
  const COMMAND_ID = ethers.id('test-command-1');
  
  let deployer: Signer;
  let other: Signer;
  let deployerAddress: string;
  let otherAddress: string;
  let gateway: any;
  let uniswapAlexarReceiver: any;
  let mockUniswapV3Factory: any;

  async function mockContracts() {
    const [dep, oth] = await ethers.getSigners();
    deployer = dep;
    other = oth;
    deployerAddress = await deployer.getAddress();
    otherAddress = await other.getAddress();

    const Gateway = await ethers.getContractFactory('MockAxelarGateway');
    const UniswapAlexarReceiver = await ethers.getContractFactory(
      'UniswapAlexarReceiver',
      deployer
    );
    const MockUniswapV3Factory = await ethers.getContractFactory(
      'MockUniswapV3Factory',
      deployer
    );

    gateway = await Gateway.deploy();
    mockUniswapV3Factory = await MockUniswapV3Factory.deploy();
    uniswapAlexarReceiver = await UniswapAlexarReceiver.deploy(
      await gateway.getAddress(),
      deployerAddress
    );

    return { uniswapAlexarReceiver, mockUniswapV3Factory, gateway, deployer, other, deployerAddress, otherAddress };
  }

  function encodePayload(
    sender: string,
    data: Array<{
      target: string;
      value: number;
      callData: string;
    }>
  ) {
    const callsAsArray = data.map((call) => [
      call.target,
      call.value,
      call.callData,
    ]);

    const packedSender = ethers.solidityPacked(['address'], [sender]);
    const payload = abiCoder.encode(
      ['bytes', '(address,uint256,bytes)[]'],
      [packedSender, callsAsArray]
    );
    return payload;
  }

  async function approve(
    gateway: any,
    commandId: string,
    sourceChain: string,
    sourceAddress: string,
    payload: string
  ) {
    await gateway.approveContractCall(
      commandId,
      sourceChain,
      sourceAddress,
      payload
    );
  }

  async function setupWhitelists() {
    // Whitelist the source sender
    await uniswapAlexarReceiver.setWhitelistedProposalSender(
      SOURCE_CHAIN,
      SOURCE_ADDRESS,
      true
    );

    // Whitelist the deployer as caller
    const packedDeployer = ethers.solidityPacked(['address'], [deployerAddress]);
    await uniswapAlexarReceiver.setWhitelistedProposalCaller(
      SOURCE_CHAIN,
      packedDeployer,
      true
    );

    // Transfer ownership of MockUniswapV3Factory to UniswapAlexarReceiver so it can call the functions
    await mockUniswapV3Factory.setOwner(await uniswapAlexarReceiver.getAddress());
  }

  beforeEach(async function () {
    await mockContracts();
  });

  describe('Whitelist Management', function () {
    it('should allow owner to set whitelisted proposal sender', async function () {
      await expect(
        uniswapAlexarReceiver.setWhitelistedProposalSender(
          SOURCE_CHAIN,
          SOURCE_ADDRESS,
          true
        )
      )
        .to.emit(uniswapAlexarReceiver, 'WhitelistedProposalSenderSet')
        .withArgs(SOURCE_CHAIN, SOURCE_ADDRESS, true);

      expect(
        await uniswapAlexarReceiver.whitelistedSenders(SOURCE_CHAIN, SOURCE_ADDRESS)
      ).to.be.true;
    });

    it('should allow owner to set whitelisted proposal caller', async function () {
      const packedCaller = ethers.solidityPacked(['address'], [deployerAddress]);
      
      await expect(
        uniswapAlexarReceiver.setWhitelistedProposalCaller(
          SOURCE_CHAIN,
          packedCaller,
          true
        )
      )
        .to.emit(uniswapAlexarReceiver, 'WhitelistedProposalCallerSet')
        .withArgs(SOURCE_CHAIN, packedCaller, true);

      expect(
        await uniswapAlexarReceiver.whitelistedCallers(SOURCE_CHAIN, packedCaller)
      ).to.be.true;
    });

    it('should not allow non-owner to set whitelisted proposal sender', async function () {
      await expect(
        uniswapAlexarReceiver.connect(other).setWhitelistedProposalSender(
          SOURCE_CHAIN,
          SOURCE_ADDRESS,
          true
        )
      ).to.be.revertedWithCustomError(uniswapAlexarReceiver, 'NotOwner');
    });

    it('should not allow non-owner to set whitelisted proposal caller', async function () {
      const packedCaller = ethers.solidityPacked(['address'], [deployerAddress]);
      
      await expect(
        uniswapAlexarReceiver.connect(other).setWhitelistedProposalCaller(
          SOURCE_CHAIN,
          packedCaller,
          true
        )
      ).to.be.revertedWithCustomError(uniswapAlexarReceiver, 'NotOwner');
    });
  });

  describe('MockUniswapV3Factory Operations', function () {
    beforeEach(async function () {
      await setupWhitelists();
    });

    it('should execute setOwner on MockUniswapV3Factory', async function () {
      // Prepare the call data for setOwner
      const newOwnerAddress = otherAddress;
      const setOwnerCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'setOwner',
        [newOwnerAddress]
      );

      const calls = [{
        target: await mockUniswapV3Factory.getAddress(),
        value: 0,
        callData: setOwnerCallData
      }];

      const payload = encodePayload(deployerAddress, calls);

      // Approve the command
      await approve(gateway, COMMAND_ID, SOURCE_CHAIN, SOURCE_ADDRESS, payload);

      // Execute the command
      await expect(
        gateway.execute(
          uniswapAlexarReceiver,
          COMMAND_ID,
          SOURCE_CHAIN,
          SOURCE_ADDRESS,
          payload
        )
      ).to.emit(uniswapAlexarReceiver, 'ProposalExecuted');

      // Verify the owner was changed
      expect(await mockUniswapV3Factory.owner()).to.equal(newOwnerAddress);
    });

    it('should execute enableFeeAmount on MockUniswapV3Factory', async function () {
      const fee = 1000; // 0.1%
      const tickSpacing = 20;

      const enableFeeAmountCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'enableFeeAmount',
        [fee, tickSpacing]
      );

      const calls = [{
        target: await mockUniswapV3Factory.getAddress(),
        value: 0,
        callData: enableFeeAmountCallData
      }];

      const payload = encodePayload(deployerAddress, calls);

      // Approve the command
      await approve(gateway, COMMAND_ID, SOURCE_CHAIN, SOURCE_ADDRESS, payload);

      // Execute the command
      await expect(
        gateway.execute(
          uniswapAlexarReceiver,
          COMMAND_ID,
          SOURCE_CHAIN,
          SOURCE_ADDRESS,
          payload
        )
      ).to.emit(uniswapAlexarReceiver, 'ProposalExecuted');

      // Verify the fee amount was enabled
      expect(await mockUniswapV3Factory.feeAmountTickSpacing(fee)).to.equal(tickSpacing);
    });

    it('should execute multiple operations in a single proposal', async function () {
      const fee1 = 2500; // 0.25%
      const fee2 = 3500; // 0.35%
      const tickSpacing1 = 50;
      const tickSpacing2 = 60;

      const enableFeeAmountCallData1 = mockUniswapV3Factory.interface.encodeFunctionData(
        'enableFeeAmount',
        [fee1, tickSpacing1]
      );

      const enableFeeAmountCallData2 = mockUniswapV3Factory.interface.encodeFunctionData(
        'enableFeeAmount',
        [fee2, tickSpacing2]
      );

      const calls = [
        {
          target: await mockUniswapV3Factory.getAddress(),
          value: 0,
          callData: enableFeeAmountCallData1
        },
        {
          target: await mockUniswapV3Factory.getAddress(),
          value: 0,
          callData: enableFeeAmountCallData2
        }
      ];

      const payload = encodePayload(deployerAddress, calls);

      // Approve the command
      await approve(gateway, COMMAND_ID, SOURCE_CHAIN, SOURCE_ADDRESS, payload);

      // Execute the command
      await expect(
        gateway.execute(
          uniswapAlexarReceiver,
          COMMAND_ID,
          SOURCE_CHAIN,
          SOURCE_ADDRESS,
          payload
        )
      ).to.emit(uniswapAlexarReceiver, 'ProposalExecuted');

      // Verify both operations were executed
      expect(await mockUniswapV3Factory.feeAmountTickSpacing(fee1)).to.equal(tickSpacing1);
      expect(await mockUniswapV3Factory.feeAmountTickSpacing(fee2)).to.equal(tickSpacing2);
    });
  });

  describe('Error Scenarios', function () {
    beforeEach(async function () {
      await setupWhitelists();
    });

    it('should revert when sender is not whitelisted', async function () {
      const unauthorizedSender = '0x' + '2'.repeat(40);
      
      const calls = [{
        target: await mockUniswapV3Factory.getAddress(),
        value: 0,
        callData: '0x'
      }];

      const payload = encodePayload(deployerAddress, calls);

      // Approve the command with unauthorized sender
      await approve(gateway, COMMAND_ID, SOURCE_CHAIN, unauthorizedSender, payload);

      // Execute should revert
      await expect(
        gateway.execute(
          uniswapAlexarReceiver,
          COMMAND_ID,
          SOURCE_CHAIN,
          unauthorizedSender,
          payload
        )
      ).to.be.revertedWithCustomError(uniswapAlexarReceiver, 'NotWhitelistedSourceAddress');
    });

    it('should revert when caller is not whitelisted', async function () {
      const unauthorizedCaller = otherAddress;
      
      const calls = [{
        target: await mockUniswapV3Factory.getAddress(),
        value: 0,
        callData: '0x'
      }];

      const payload = encodePayload(unauthorizedCaller, calls);

      // Approve the command
      await approve(gateway, COMMAND_ID, SOURCE_CHAIN, SOURCE_ADDRESS, payload);

      // Execute should revert
      await expect(
        gateway.execute(
          uniswapAlexarReceiver,
          COMMAND_ID,
          SOURCE_CHAIN,
          SOURCE_ADDRESS,
          payload
        )
      ).to.be.revertedWithCustomError(uniswapAlexarReceiver, 'NotWhitelistedCaller');
    });

    it('should revert on command replay', async function () {
      // Use a valid function call - enable a new fee amount
      const fee = 1500;
      const tickSpacing = 30;
      const enableFeeAmountCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'enableFeeAmount',
        [fee, tickSpacing]
      );

      const calls = [{
        target: await mockUniswapV3Factory.getAddress(),
        value: 0,
        callData: enableFeeAmountCallData
      }];

      const payload = encodePayload(deployerAddress, calls);

      // Approve the command
      await approve(gateway, COMMAND_ID, SOURCE_CHAIN, SOURCE_ADDRESS, payload);

      // Execute the command first time
      await gateway.execute(
        uniswapAlexarReceiver,
        COMMAND_ID,
        SOURCE_CHAIN,
        SOURCE_ADDRESS,
        payload
      );

      // Verify the command was processed
      expect(await uniswapAlexarReceiver.processedCommands(COMMAND_ID)).to.be.true;

      // Approve the same command ID again (simulating gateway allowing it somehow)
      await approve(gateway, COMMAND_ID, SOURCE_CHAIN, SOURCE_ADDRESS, payload);

      // Try to execute the same command again should revert due to replay protection
      await expect(
        gateway.execute(
          uniswapAlexarReceiver,
          COMMAND_ID,
          SOURCE_CHAIN,
          SOURCE_ADDRESS,
          payload
        )
      ).to.be.revertedWith('Command replay');
    });

    it('should handle failed MockUniswapV3Factory operations', async function () {
      // Try to enable fee amount with invalid parameters (fee >= 1000000)
      const invalidFee = 1000000;
      const tickSpacing = 20;

      const enableFeeAmountCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'enableFeeAmount',
        [invalidFee, tickSpacing]
      );

      const calls = [{
        target: await mockUniswapV3Factory.getAddress(),
        value: 0,
        callData: enableFeeAmountCallData
      }];

      const payload = encodePayload(deployerAddress, calls);

      // Approve the command
      await approve(gateway, COMMAND_ID, SOURCE_CHAIN, SOURCE_ADDRESS, payload);

      // Execute should revert
      await expect(
        gateway.execute(
          uniswapAlexarReceiver,
          COMMAND_ID,
          SOURCE_CHAIN,
          SOURCE_ADDRESS,
          payload
        )
      ).to.be.reverted; // The MockUniswapV3Factory will revert
    });

    it('should handle owner change through proposal execution', async function () {
      // Change owner through proposal execution
      const newOwnerAddress = otherAddress;
      const setOwnerCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'setOwner',
        [newOwnerAddress]
      );

      const calls = [{
        target: await mockUniswapV3Factory.getAddress(),
        value: 0,
        callData: setOwnerCallData
      }];

      const payload = encodePayload(deployerAddress, calls);
      const commandId = ethers.id('test-command-owner-change');
      await approve(gateway, commandId, SOURCE_CHAIN, SOURCE_ADDRESS, payload);
      
      await gateway.execute(uniswapAlexarReceiver, commandId, SOURCE_CHAIN, SOURCE_ADDRESS, payload);

      // Verify the owner was changed
      expect(await mockUniswapV3Factory.owner()).to.equal(newOwnerAddress);

      // Now if we try to execute another command, it should fail because the receiver is no longer the owner
      const anotherSetOwnerCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'setOwner',
        [deployerAddress]
      );

      const calls2 = [{
        target: await mockUniswapV3Factory.getAddress(),
        value: 0,
        callData: anotherSetOwnerCallData
      }];

      const payload2 = encodePayload(deployerAddress, calls2);
      const commandId2 = ethers.id('test-command-2');
      await approve(gateway, commandId2, SOURCE_CHAIN, SOURCE_ADDRESS, payload2);

      // This should fail because the receiver is no longer the owner
      await expect(
        gateway.execute(uniswapAlexarReceiver, commandId2, SOURCE_CHAIN, SOURCE_ADDRESS, payload2)
      ).to.be.reverted;
    });
  });

  describe('Event Emissions', function () {
    beforeEach(async function () {
      await setupWhitelists();
    });

    it('should emit ProposalExecuted event with correct payload hash', async function () {
      // Use a valid function call - enable a new fee amount
      const fee = 1200;
      const tickSpacing = 25;
      const enableFeeAmountCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'enableFeeAmount',
        [fee, tickSpacing]
      );

      const calls = [{
        target: await mockUniswapV3Factory.getAddress(),
        value: 0,
        callData: enableFeeAmountCallData
      }];

      const payload = encodePayload(deployerAddress, calls);
      const expectedPayloadHash = keccak256(
        abiCoder.encode(
          ['string', 'string', 'bytes', 'bytes'],
          [SOURCE_CHAIN, SOURCE_ADDRESS, ethers.solidityPacked(['address'], [deployerAddress]), payload]
        )
      );

      // Approve the command
      await approve(gateway, COMMAND_ID, SOURCE_CHAIN, SOURCE_ADDRESS, payload);

      // Execute and check event
      await expect(
        gateway.execute(
          uniswapAlexarReceiver,
          COMMAND_ID,
          SOURCE_CHAIN,
          SOURCE_ADDRESS,
          payload
        )
      ).to.emit(uniswapAlexarReceiver, 'ProposalExecuted')
        .withArgs(expectedPayloadHash);
    });
  });

  describe('Contract Initialization', function () {
    it('should initialize with correct gateway and owner', async function () {
      expect(await uniswapAlexarReceiver.gateway()).to.equal(await gateway.getAddress());
      expect(await uniswapAlexarReceiver.owner()).to.equal(deployerAddress);
    });

    it('should revert deployment with zero gateway address', async function () {
      const UniswapAlexarReceiver = await ethers.getContractFactory('UniswapAlexarReceiver');
      
      // AxelarExecutable constructor checks for zero address first and throws InvalidAddress custom error
      await expect(
        UniswapAlexarReceiver.deploy(ethers.ZeroAddress, deployerAddress)
      ).to.be.revertedWithCustomError(UniswapAlexarReceiver, 'InvalidAddress');
    });
  });

  describe('Receive Function', function () {
    it('should accept native token transfers', async function () {
      const amount = ethers.parseEther('1');
      const receiverAddress = await uniswapAlexarReceiver.getAddress();
      
      await expect(() =>
        deployer.sendTransaction({
          to: receiverAddress,
          value: amount
        })
      ).to.changeEtherBalance(uniswapAlexarReceiver, amount);
    });
  });
});
