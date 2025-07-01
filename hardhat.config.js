require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-verify');
require('hardhat-gas-reporter');
require('solidity-coverage');
require('dotenv').config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// Custom task to get contract size
task('size', 'Prints contract size', async (taskArgs, hre) => {
  await hre.run('compile');
  const artifacts = await hre.artifacts.getAllFullyQualifiedNames();
  
  for (const artifact of artifacts) {
    const contractArtifact = await hre.artifacts.readArtifact(artifact);
    const bytecodeSize = contractArtifact.bytecode.length / 2 - 1;
    console.log(`${artifact}: ${bytecodeSize} bytes`);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 12000000,
      allowUnlimitedContractSize: true,
      accounts: {
        mnemonic: process.env.MNEMONIC || 'test test test test test test test test test test test junk',
        count: 20,
        accountsBalance: '10000000000000000000000', // 10,000 ETH
      },
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 12000000,
      allowUnlimitedContractSize: true,
    },
    // AB Chain Testnet
    'abchain-testnet': {
      url: process.env.ABCHAIN_TESTNET_RPC_URL || 'https://testnet-rpc.abchain.com',
      chainId: 512512,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 8000000,
      gasPrice: 20000000000, // 20 gwei
      timeout: 60000,
    },
    // AB Chain Mainnet
    'abchain-mainnet': {
      url: process.env.ABCHAIN_MAINNET_RPC_URL || 'https://mainnet-rpc.abchain.com',
      chainId: 512,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 8000000,
      gasPrice: 20000000000, // 20 gwei
      timeout: 60000,
    },
    // Ethereum Sepolia Testnet (for testing)
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 6000000,
      gasPrice: 20000000000, // 20 gwei
    },
    // Ethereum Mainnet (for reference)
    mainnet: {
      url: process.env.MAINNET_RPC_URL || `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 1,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 6000000,
      gasPrice: 20000000000, // 20 gwei
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
    gasPrice: 20,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: 'ETH',
    gasPriceApi: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice',
    showTimeSpent: true,
    showMethodSig: true,
    maxMethodDiff: 10,
  },
  etherscan: {
    // AB Chain Explorer API configuration
    apiKey: {
      'abchain-testnet': process.env.ABCHAIN_EXPLORER_API_KEY || 'your-api-key',
      'abchain-mainnet': process.env.ABCHAIN_EXPLORER_API_KEY || 'your-api-key',
      sepolia: process.env.ETHERSCAN_API_KEY || 'your-api-key',
      mainnet: process.env.ETHERSCAN_API_KEY || 'your-api-key',
    },
    customChains: [
      {
        network: 'abchain-testnet',
        chainId: 512512,
        urls: {
          apiURL: 'https://testnet-explorer.abchain.com/api',
          browserURL: 'https://testnet-explorer.abchain.com',
        },
      },
      {
        network: 'abchain-mainnet',
        chainId: 512,
        urls: {
          apiURL: 'https://explorer.abchain.com/api',
          browserURL: 'https://explorer.abchain.com',
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
  paths: {
    sources: './contracts',
    tests: './tests/contracts',
    cache: './cache',
    artifacts: './artifacts',
  },
  mocha: {
    timeout: 40000,
    reporter: 'spec',
    slow: 300,
    bail: false,
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
    alwaysGenerateOverloads: false,
    externalArtifacts: ['externalArtifacts/*.json'],
    dontOverrideCompile: false,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: [':ABTokenFactory$', ':ABLiquidityManager$'],
  },
  docgen: {
    path: './docs/contracts',
    clear: true,
    runOnCompile: false,
  },
};