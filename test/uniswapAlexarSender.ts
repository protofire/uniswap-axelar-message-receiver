import { expect } from 'chai';
import { ethers } from 'hardhat';
import { keccak256 } from 'ethers';
import { Signer } from 'ethers';

const abiCoder = ethers.AbiCoder.defaultAbiCoder();

describe('UniswapAlexarSender', function () {
  // Constants for testing
  const DESTINATION_CHAIN = 'polygon';
  const DESTINATION_CONTRACT = '0x' + '2'.repeat(40);
  const ANOTHER_CHAIN = 'avalanche';
  const ANOTHER_CONTRACT = '0x' + '3'.repeat(40);
  
  let deployer: Signer;
  let other: Signer;
  let deployerAddress: string;
  let otherAddress: string;
  let mockGateway: any;
  let mockGasService: any;
  let uniswapAlexarSender: any;
  let mockUniswapV3Factory: any;

  async function deployContracts() {
    const [dep, oth] = await ethers.getSigners();
    deployer = dep;
    other = oth;
    deployerAddress = await deployer.getAddress();
    otherAddress = await other.getAddress();

    // Deploy mock contracts
    const MockGateway = await ethers.getContractFactory('MockAxelarGateway');
    const MockGasService = await ethers.getContractFactory('MockAxelarGasService');
    const UniswapAlexarSender = await ethers.getContractFactory('UniswapAlexarSender');
    const MockUniswapV3Factory = await ethers.getContractFactory('MockUniswapV3Factory');

    mockGateway = await MockGateway.deploy();
    mockGasService = await MockGasService.deploy();
    mockUniswapV3Factory = await MockUniswapV3Factory.deploy();
    
    uniswapAlexarSender = await UniswapAlexarSender.deploy(
      await mockGateway.getAddress(),
      await mockGasService.getAddress()
    );

    return {
      uniswapAlexarSender,
      mockGateway,
      mockGasService,
      mockUniswapV3Factory,
      deployer,
      other,
      deployerAddress,
      otherAddress
    };
  }

  // Helper function to create interchain calls with proper types
  function createUniswapCall(
    destinationChain: string,
    destinationContract: string,
    gas: number,
    calls: { target: string; value: number; callData: string }[]
  ) {
    return {
      destinationChain,
      destinationContract,
      gas,
      calls
    };
  }

  // Helper function to create individual calls
  function createCall(target: string, value: number, callData: string) {
    return { target, value, callData };
  }

  beforeEach(async function () {
    await deployContracts();
  });

  describe('Contract Initialization', function () {
    it('should initialize with correct gateway and gas service', async function () {
      expect(await uniswapAlexarSender.gateway()).to.equal(await mockGateway.getAddress());
      expect(await uniswapAlexarSender.gasService()).to.equal(await mockGasService.getAddress());
    });

    it('should revert deployment with zero gateway address', async function () {
      const UniswapAlexarSender = await ethers.getContractFactory('UniswapAlexarSender');
      
      await expect(
        UniswapAlexarSender.deploy(ethers.ZeroAddress, await mockGasService.getAddress())
      ).to.be.revertedWithCustomError(UniswapAlexarSender, 'InvalidAddress');
    });

    it('should revert deployment with zero gas service address', async function () {
      const UniswapAlexarSender = await ethers.getContractFactory('UniswapAlexarSender');
      
      await expect(
        UniswapAlexarSender.deploy(await mockGateway.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(UniswapAlexarSender, 'InvalidAddress');
    });

    it('should revert deployment with both zero addresses', async function () {
      const UniswapAlexarSender = await ethers.getContractFactory('UniswapAlexarSender');
      
      await expect(
        UniswapAlexarSender.deploy(ethers.ZeroAddress, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(UniswapAlexarSender, 'InvalidAddress');
    });
  });

  describe('Single Proposal Sending', function () {
    it('should send proposal with MockUniswapV3Factory setOwner call', async function () {
      const newOwner = otherAddress;
      const setOwnerCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'setOwner',
        [newOwner]
      );

      const calls = [createCall(await mockUniswapV3Factory.getAddress(), 0, setOwnerCallData)];
      const gasAmount = ethers.parseEther('0.1');

      const expectedPayload = abiCoder.encode(
        ['bytes', '(address,uint256,bytes)[]'],
        [
          ethers.solidityPacked(['address'], [deployerAddress]),
          calls.map(call => [call.target, call.value, call.callData])
        ]
      );

      await expect(
        uniswapAlexarSender.sendProposal(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          calls,
          { value: gasAmount }
        )
      ).to.emit(mockGasService, 'NativeGasPaidForContractCall')
        .withArgs(
          await uniswapAlexarSender.getAddress(),
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          expectedPayload,
          gasAmount,
          deployerAddress
        )
        .and.to.emit(mockGateway, 'ContractCall')
        .withArgs(
          await uniswapAlexarSender.getAddress(),
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          keccak256(expectedPayload),
          expectedPayload
        );
    });

    it('should send proposal with MockUniswapV3Factory enableFeeAmount call', async function () {
      const fee = 3000;
      const tickSpacing = 60;
      const enableFeeAmountCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'enableFeeAmount',
        [fee, tickSpacing]
      );

      const calls = [createCall(await mockUniswapV3Factory.getAddress(), 0, enableFeeAmountCallData)];
      const gasAmount = ethers.parseEther('0.05');

      await expect(
        uniswapAlexarSender.sendProposal(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          calls,
          { value: gasAmount }
        )
      ).to.not.be.reverted;
    });

    it('should send proposal with multiple calls', async function () {
      const newOwner = otherAddress;
      const fee = 1000;
      const tickSpacing = 20;

      const setOwnerCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'setOwner',
        [newOwner]
      );
      const enableFeeAmountCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'enableFeeAmount',
        [fee, tickSpacing]
      );

      const calls = [
        createCall(await mockUniswapV3Factory.getAddress(), 0, setOwnerCallData),
        createCall(await mockUniswapV3Factory.getAddress(), 0, enableFeeAmountCallData)
      ];
      const gasAmount = ethers.parseEther('0.2');

      await expect(
        uniswapAlexarSender.sendProposal(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          calls,
          { value: gasAmount }
        )
      ).to.not.be.reverted;
    });

    it('should send proposal with zero gas (no gas payment)', async function () {
      const setOwnerCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'setOwner',
        [otherAddress]
      );

      const calls = [createCall(await mockUniswapV3Factory.getAddress(), 0, setOwnerCallData)];

      const expectedPayload = abiCoder.encode(
        ['bytes', '(address,uint256,bytes)[]'],
        [
          ethers.solidityPacked(['address'], [deployerAddress]),
          calls.map(call => [call.target, call.value, call.callData])
        ]
      );

      // Should only emit ContractCall, not gas payment
      await expect(
        uniswapAlexarSender.sendProposal(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          calls,
          { value: 0 }
        )
      ).to.emit(mockGateway, 'ContractCall')
        .withArgs(
          await uniswapAlexarSender.getAddress(),
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          keccak256(expectedPayload),
          expectedPayload
        )
        .and.to.not.emit(mockGasService, 'NativeGasPaidForContractCall');
    });

    it('should send proposal with native token value in calls', async function () {
      const targetContract = await mockUniswapV3Factory.getAddress();
      const value = 1000000; // Use smaller value that fits in Number
      const gasAmount = ethers.parseEther('0.1');

      // Create a call with native token value
      const calls = [createCall(targetContract, value, '0x')];

      await expect(
        uniswapAlexarSender.sendProposal(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          calls,
          { value: gasAmount }
        )
      ).to.not.be.reverted;
    });
  });

  describe('Multiple Proposals Sending', function () {
    it('should send proposals to multiple chains', async function () {
      const setOwnerCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'setOwner',
        [otherAddress]
      );
      const enableFeeAmountCallData = mockUniswapV3Factory.interface.encodeFunctionData(
        'enableFeeAmount',
        [3000, 60]
      );

      const gasAmount1 = 100000;
      const gasAmount2 = 150000;
      const totalGas = gasAmount1 + gasAmount2; // 250000

      const UniswapCalls = [
        createUniswapCall(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          gasAmount1,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, setOwnerCallData)]
        ),
        createUniswapCall(
          ANOTHER_CHAIN,
          ANOTHER_CONTRACT,
          gasAmount2,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, enableFeeAmountCallData)]
        )
      ];

      await expect(
        uniswapAlexarSender.sendProposals(UniswapCalls, { value: totalGas })
      ).to.not.be.reverted;
    });

    it('should send proposals with different gas amounts', async function () {
      const callData = mockUniswapV3Factory.interface.encodeFunctionData('setOwner', [otherAddress]);
      
      const gasAmount1 = 100000;
      const gasAmount2 = 150000;
      const gasAmount3 = 50000;
      const totalGas = gasAmount1 + gasAmount2 + gasAmount3; // 300000

      const UniswapCalls = [
        createUniswapCall(
          'ethereum',
          DESTINATION_CONTRACT,
          gasAmount1,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        ),
        createUniswapCall(
          'polygon',
          DESTINATION_CONTRACT,
          gasAmount2,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        ),
        createUniswapCall(
          'avalanche',
          DESTINATION_CONTRACT,
          gasAmount3,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        )
      ];

      await expect(
        uniswapAlexarSender.sendProposals(UniswapCalls, { value: totalGas })
      ).to.not.be.reverted;
    });

    it('should send proposals with zero gas on some chains', async function () {
      const callData = mockUniswapV3Factory.interface.encodeFunctionData('setOwner', [otherAddress]);
      
      const gasAmount1 = 100000;
      const gasAmount2 = 0; // No gas for second chain
      const totalGas = gasAmount1; // gasAmount1 + gasAmount2 = gasAmount1 + 0

      const UniswapCalls = [
        createUniswapCall(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          gasAmount1,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        ),
        createUniswapCall(
          ANOTHER_CHAIN,
          ANOTHER_CONTRACT,
          gasAmount2,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        )
      ];

      await expect(
        uniswapAlexarSender.sendProposals(UniswapCalls, { value: totalGas })
      ).to.not.be.reverted;
    });

    it('should handle empty proposals array', async function () {
      await expect(
        uniswapAlexarSender.sendProposals([], { value: 0 })
      ).to.not.be.reverted;
    });
  });

  describe('Error Scenarios', function () {
    it('should revert when fee does not match total gas in sendProposals', async function () {
      const callData = mockUniswapV3Factory.interface.encodeFunctionData('setOwner', [otherAddress]);
      const gasAmount = ethers.parseEther('0.1');
      const incorrectFee = ethers.parseEther('0.05'); // Different from gas amount

      const UniswapCalls = [
        createUniswapCall(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          100000,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        )
      ];

      await expect(
        uniswapAlexarSender.sendProposals(UniswapCalls, { value: incorrectFee })
      ).to.be.revertedWithCustomError(uniswapAlexarSender, 'InvalidFee');
    });

    it('should revert when total gas exceeds msg.value in sendProposals', async function () {
      const callData = mockUniswapV3Factory.interface.encodeFunctionData('setOwner', [otherAddress]);
      
      const gasAmount1 = ethers.parseEther('0.1');
      const gasAmount2 = ethers.parseEther('0.2');
      const totalGas = ethers.parseEther('0.3'); // gasAmount1 + gasAmount2
      const insufficientFee = ethers.parseEther('0.2'); // Less than total gas

      const UniswapCalls = [
        createUniswapCall(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          100000,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        ),
        createUniswapCall(
          ANOTHER_CHAIN,
          ANOTHER_CONTRACT,
          150000,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        )
      ];

      await expect(
        uniswapAlexarSender.sendProposals(UniswapCalls, { value: insufficientFee })
      ).to.be.revertedWithCustomError(uniswapAlexarSender, 'InvalidFee');
    });

    it('should revert when msg.value exceeds total gas in sendProposals', async function () {
      const callData = mockUniswapV3Factory.interface.encodeFunctionData('setOwner', [otherAddress]);
      const gasAmount = ethers.parseEther('0.1');
      const excessiveFee = ethers.parseEther('0.5'); // More than gas amount

      const UniswapCalls = [
        createUniswapCall(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          100000,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        )
      ];

      await expect(
        uniswapAlexarSender.sendProposals(UniswapCalls, { value: excessiveFee })
      ).to.be.revertedWithCustomError(uniswapAlexarSender, 'InvalidFee');
    });

    it('should handle complex fee calculations correctly', async function () {
      const callData = mockUniswapV3Factory.interface.encodeFunctionData('setOwner', [otherAddress]);
      
      // Use consistent gas amounts
      const gasAmount1 = 100000;
      const gasAmount2 = 150000;
      const gasAmount3 = 50000;
      const totalGas = gasAmount1 + gasAmount2 + gasAmount3; // 300000

      const UniswapCalls = [
        createUniswapCall(
          'ethereum',
          DESTINATION_CONTRACT,
          gasAmount1,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        ),
        createUniswapCall(
          'polygon',
          DESTINATION_CONTRACT,
          gasAmount2,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        ),
        createUniswapCall(
          'avalanche',
          DESTINATION_CONTRACT,
          gasAmount3,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        )
      ];

      // Should succeed with exact total
      await expect(
        uniswapAlexarSender.sendProposals(UniswapCalls, { value: totalGas })
      ).to.not.be.reverted;

      // Should fail with off-by-one
      await expect(
        uniswapAlexarSender.sendProposals(UniswapCalls, { value: totalGas - 1 })
      ).to.be.revertedWithCustomError(uniswapAlexarSender, 'InvalidFee');
    });
  });

  describe('Gas Service Integration', function () {
    it('should pay gas correctly for single proposal', async function () {
      const callData = mockUniswapV3Factory.interface.encodeFunctionData('setOwner', [otherAddress]);
      const calls = [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)];
      const gasAmount = ethers.parseEther('0.1');

      const expectedPayload = abiCoder.encode(
        ['bytes', '(address,uint256,bytes)[]'],
        [
          ethers.solidityPacked(['address'], [deployerAddress]),
          calls.map(call => [call.target, call.value, call.callData])
        ]
      );

      await expect(
        uniswapAlexarSender.sendProposal(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          calls,
          { value: gasAmount }
        )
      ).to.emit(mockGasService, 'NativeGasPaidForContractCall')
        .withArgs(
          await uniswapAlexarSender.getAddress(),
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          expectedPayload,
          gasAmount,
          deployerAddress
        );
    });

    it('should pay gas correctly for multiple proposals', async function () {
      const callData = mockUniswapV3Factory.interface.encodeFunctionData('setOwner', [otherAddress]);
      
      const gasAmount1 = 100000;
      const gasAmount2 = 150000;
      const totalGas = gasAmount1 + gasAmount2; // 250000

      const UniswapCalls = [
        createUniswapCall(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          gasAmount1,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        ),
        createUniswapCall(
          ANOTHER_CHAIN,
          ANOTHER_CONTRACT,
          gasAmount2,
          [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)]
        )
      ];

      // Should emit gas payment for both proposals
      const tx = uniswapAlexarSender.sendProposals(UniswapCalls, { value: totalGas });
      
      await expect(tx).to.emit(mockGasService, 'NativeGasPaidForContractCall');
    });

    it('should not pay gas when gas amount is zero', async function () {
      const callData = mockUniswapV3Factory.interface.encodeFunctionData('setOwner', [otherAddress]);
      const calls = [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)];

      await expect(
        uniswapAlexarSender.sendProposal(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          calls,
          { value: 0 }
        )
      ).to.not.emit(mockGasService, 'NativeGasPaidForContractCall');
    });
  });

  describe('Payload Encoding', function () {
    it('should encode payload correctly with sender address', async function () {
      const callData = mockUniswapV3Factory.interface.encodeFunctionData('setOwner', [otherAddress]);
      const calls = [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)];

      const expectedPayload = abiCoder.encode(
        ['bytes', '(address,uint256,bytes)[]'],
        [
          ethers.solidityPacked(['address'], [deployerAddress]),
          calls.map(call => [call.target, call.value, call.callData])
        ]
      );

      await expect(
        uniswapAlexarSender.sendProposal(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          calls,
          { value: 0 }
        )
      ).to.emit(mockGateway, 'ContractCall')
        .withArgs(
          await uniswapAlexarSender.getAddress(),
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          keccak256(expectedPayload),
          expectedPayload
        );
    });

    it('should encode payload correctly with different senders', async function () {
      const callData = mockUniswapV3Factory.interface.encodeFunctionData('setOwner', [deployerAddress]);
      const calls = [createCall(await mockUniswapV3Factory.getAddress(), 0, callData)];

      // Send from different account
      const expectedPayload = abiCoder.encode(
        ['bytes', '(address,uint256,bytes)[]'],
        [
          ethers.solidityPacked(['address'], [otherAddress]),
          calls.map(call => [call.target, call.value, call.callData])
        ]
      );

      await expect(
        uniswapAlexarSender.connect(other).sendProposal(
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          calls,
          { value: 0 }
        )
      ).to.emit(mockGateway, 'ContractCall')
        .withArgs(
          await uniswapAlexarSender.getAddress(),
          DESTINATION_CHAIN,
          DESTINATION_CONTRACT,
          keccak256(expectedPayload),
          expectedPayload
        );
    });
  });
});
