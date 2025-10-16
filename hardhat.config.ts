import { HardhatUserConfig } from "hardhat/config";
import type { NetworksUserConfig } from "hardhat/types";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const privateKey = process.env.PRIVATE_KEY ?? "";
const flowRpcUrl = process.env.FLOW_RPC_URL ?? "";
const flowTestnetRpcUrl = process.env.FLOW_TESTNET_RPC_URL ?? "";
const optimismSepoliaRpcUrl = process.env.OP_SEPOLIA_RPC_URL ?? "";
const baseSepoliaRpcUrl = process.env.BASE_SEPOLIA_RPC_URL ?? "";
const monadTestnetRpcUrl = process.env.MONAD_TESTNET_RPC_URL ?? "";
const ethSepoliaRpcUrl = process.env.ETH_SEPOLIA_RPC_URL ?? "";
const kavaTestnetRpcUrl = process.env.KAVA_TESTNET_RPC_URL ?? "";

const accounts = privateKey !== "" ? [privateKey] : undefined;

const networks: NetworksUserConfig = {
  hardhat: {},
};

if (flowRpcUrl) {
  networks.flow = {
    url: flowRpcUrl,
    accounts,
    chainId: 747,
  };
}

if (flowTestnetRpcUrl) {
  networks['flow-testnet'] = {
    url: flowTestnetRpcUrl,
    accounts,
    chainId: 545,
  };
}

if (optimismSepoliaRpcUrl) {
  networks['optimism-sepolia'] = {
    url: optimismSepoliaRpcUrl,
    accounts,
    chainId: 11155420,
  };
}

if (baseSepoliaRpcUrl) {
  networks['base-sepolia'] = {
    url: baseSepoliaRpcUrl,
    accounts,
    chainId: 84532,
  };
}

if (monadTestnetRpcUrl) {
  networks['monad-testnet'] = {
    url: monadTestnetRpcUrl,
    accounts,
    chainId: 10143,
  };
}

if (ethSepoliaRpcUrl) {
  networks['sepolia'] = {
    url: ethSepoliaRpcUrl,
    accounts,
    chainId: 11155111,
  };
}

if (kavaTestnetRpcUrl) {
  networks['kava-testnet'] = {
    url: kavaTestnetRpcUrl,
    accounts,
    chainId: 2221,
  };
}

const config = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000,
      },
      evmVersion: "london",
    },
  },
  networks,
  etherscan: {
    customChains: [
      {
        network: "flow",
        chainId: 747,
        urls: {
          apiURL: "https://evm.flowscan.io/api",
          browserURL: "https://evm.flowscan.io",
        },
      },
      {
        network: "flow-testnet",
        chainId: 545,
        urls: {
          apiURL: "https://evm-testnet.flowscan.io/api",
          browserURL: "https://evm-testnet.flowscan.io",
        },
      },
      {
        network: "optimism-sepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://testnet-explorer.optimism.io/api",
          browserURL: "https://testnet-explorer.optimism.io",
        },
      },
      {
        network: "kava-testnet",
        chainId: 2221,
        urls: {
          apiURL: "https://api.verify.mintscan.io/evm/solidity/verify/standard-json",
          browserURL: "https://testnet.kavascan.com",
        },
      },
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://base-sepolia.blockscout.com/api",
          browserURL: "https://base-sepolia.blockscout.com",
        },
      },
    ],
    apiKey: {
      flow: "abc",
      'flow-testnet': "abc",
      'optimism-sepolia': "abc",
      'kava-testnet': "abc",
      'blast-sepolia': "abc",
    },
  },
  sourcify: {
    enabled: true
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config as HardhatUserConfig;
