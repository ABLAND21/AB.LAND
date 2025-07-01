const { ethers, network } = require('hardhat');
const fs = require('fs');
const path = require('path');

// Configuration for different networks
const NETWORK_CONFIG = {
  localhost: {
    name: 'Localhost',
    confirmations: 1,
    gasPrice: ethers.parseUnits('20', 'gwei'),
  },
  'abchain-testnet': {
    name: 'AB Chain Testnet',
    confirmations: 2,
    gasPrice: ethers.parseUnits('20', 'gwei'),
  },
  'abchain-mainnet': {
    name: 'AB Chain Mainnet',
    confirmations: 3,
    gasPrice: ethers.parseUnits('25', 'gwei'),
  },
  sepolia: {
    name: 'Ethereum Sepolia',
    confirmations: 2,
    gasPrice: ethers.parseUnits('30', 'gwei'),
  },
};

// Deployment parameters
const DEPLOYMENT_PARAMS = {
  // Token Factory parameters
  tokenFactory: {
    creationFee: ethers.parseEther('0.001'), // 0.001 AB (~$2)
    feeRecipient: null, // Will be set to deployer address
  },
  // Liquidity Manager parameters
  liquidityManager: {
    swapFee: 300, // 0.3% (300 basis points)
    protocolFee: 100, // 0.1% (100 basis points)
  },
};

async function main() {
  console.log('🚀 Starting AB.LAND Smart Contract Deployment');
  console.log('=' .repeat(60));

  // Get network configuration
  const networkName = network.name;
  const config = NETWORK_CONFIG[networkName];
  
  if (!config) {
    throw new Error(`Network ${networkName} is not supported`);
  }

  console.log(`📡 Network: ${config.name} (${networkName})`);
  console.log(`⛽ Gas Price: ${ethers.formatUnits(config.gasPrice, 'gwei')} gwei`);
  console.log(`✅ Confirmations: ${config.confirmations}`);
  console.log('');

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const deployerBalance = await ethers.provider.getBalance(deployerAddress);

  console.log('👤 Deployer Information:');
  console.log(`   Address: ${deployerAddress}`);
  console.log(`   Balance: ${ethers.formatEther(deployerBalance)} ETH`);
  console.log('');

  // Check minimum balance
  const minBalance = ethers.parseEther('0.1');
  if (deployerBalance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.1 ETH, got ${ethers.formatEther(deployerBalance)} ETH`);
  }

  // Set fee recipient to deployer if not specified
  if (!DEPLOYMENT_PARAMS.tokenFactory.feeRecipient) {
    DEPLOYMENT_PARAMS.tokenFactory.feeRecipient = deployerAddress;
  }

  const deploymentResults = {};
  const gasUsed = {};

  try {
    // Deploy ABTokenFactory
    console.log('📦 Deploying ABTokenFactory...');
    const ABTokenFactory = await ethers.getContractFactory('ABTokenFactory');
    
    const tokenFactory = await ABTokenFactory.deploy(
      DEPLOYMENT_PARAMS.tokenFactory.creationFee,
      DEPLOYMENT_PARAMS.tokenFactory.feeRecipient,
      {
        gasPrice: config.gasPrice,
      }
    );

    console.log(`   Transaction Hash: ${tokenFactory.deploymentTransaction().hash}`);
    console.log('   Waiting for confirmations...');
    
    await tokenFactory.waitForDeployment();
    const tokenFactoryAddress = await tokenFactory.getAddress();
    
    // Wait for additional confirmations
    if (config.confirmations > 1) {
      await tokenFactory.deploymentTransaction().wait(config.confirmations);
    }

    deploymentResults.tokenFactory = {
      address: tokenFactoryAddress,
      transactionHash: tokenFactory.deploymentTransaction().hash,
    };

    console.log(`   ✅ ABTokenFactory deployed to: ${tokenFactoryAddress}`);
    console.log('');

    // Deploy ABLiquidityManager
    console.log('📦 Deploying ABLiquidityManager...');
    const ABLiquidityManager = await ethers.getContractFactory('ABLiquidityManager');
    
    const liquidityManager = await ABLiquidityManager.deploy(
      tokenFactoryAddress, // Token factory address
      DEPLOYMENT_PARAMS.liquidityManager.swapFee,
      DEPLOYMENT_PARAMS.liquidityManager.protocolFee,
      deployerAddress, // Fee recipient
      {
        gasPrice: config.gasPrice,
      }
    );

    console.log(`   Transaction Hash: ${liquidityManager.deploymentTransaction().hash}`);
    console.log('   Waiting for confirmations...');
    
    await liquidityManager.waitForDeployment();
    const liquidityManagerAddress = await liquidityManager.getAddress();
    
    // Wait for additional confirmations
    if (config.confirmations > 1) {
      await liquidityManager.deploymentTransaction().wait(config.confirmations);
    }

    deploymentResults.liquidityManager = {
      address: liquidityManagerAddress,
      transactionHash: liquidityManager.deploymentTransaction().hash,
    };

    console.log(`   ✅ ABLiquidityManager deployed to: ${liquidityManagerAddress}`);
    console.log('');

    // Set liquidity manager in token factory
    console.log('🔗 Configuring contracts...');
    const setLiquidityManagerTx = await tokenFactory.setLiquidityManager(
      liquidityManagerAddress,
      {
        gasPrice: config.gasPrice,
      }
    );
    
    await setLiquidityManagerTx.wait(config.confirmations);
    console.log('   ✅ Liquidity manager set in token factory');
    console.log('');

    // Calculate total gas used
    const tokenFactoryReceipt = await ethers.provider.getTransactionReceipt(
      tokenFactory.deploymentTransaction().hash
    );
    const liquidityManagerReceipt = await ethers.provider.getTransactionReceipt(
      liquidityManager.deploymentTransaction().hash
    );
    const configReceipt = await ethers.provider.getTransactionReceipt(
      setLiquidityManagerTx.hash
    );

    const totalGasUsed = 
      tokenFactoryReceipt.gasUsed + 
      liquidityManagerReceipt.gasUsed + 
      configReceipt.gasUsed;

    const totalCost = totalGasUsed * config.gasPrice;

    gasUsed.tokenFactory = tokenFactoryReceipt.gasUsed;
    gasUsed.liquidityManager = liquidityManagerReceipt.gasUsed;
    gasUsed.configuration = configReceipt.gasUsed;
    gasUsed.total = totalGasUsed;
    gasUsed.totalCost = totalCost;

    // Print deployment summary
    console.log('📋 Deployment Summary:');
    console.log('=' .repeat(60));
    console.log(`Network: ${config.name}`);
    console.log(`Deployer: ${deployerAddress}`);
    console.log('');
    console.log('📦 Deployed Contracts:');
    console.log(`   ABTokenFactory: ${tokenFactoryAddress}`);
    console.log(`   ABLiquidityManager: ${liquidityManagerAddress}`);
    console.log('');
    console.log('⛽ Gas Usage:');
    console.log(`   ABTokenFactory: ${gasUsed.tokenFactory.toLocaleString()} gas`);
    console.log(`   ABLiquidityManager: ${gasUsed.liquidityManager.toLocaleString()} gas`);
    console.log(`   Configuration: ${gasUsed.configuration.toLocaleString()} gas`);
    console.log(`   Total: ${gasUsed.total.toLocaleString()} gas`);
    console.log(`   Total Cost: ${ethers.formatEther(totalCost)} ETH`);
    console.log('');
    console.log('⚙️  Configuration:');
    console.log(`   Creation Fee: ${ethers.formatEther(DEPLOYMENT_PARAMS.tokenFactory.creationFee)} ETH`);
    console.log(`   Fee Recipient: ${DEPLOYMENT_PARAMS.tokenFactory.feeRecipient}`);
    console.log(`   Swap Fee: ${DEPLOYMENT_PARAMS.liquidityManager.swapFee / 100}%`);
    console.log(`   Protocol Fee: ${DEPLOYMENT_PARAMS.liquidityManager.protocolFee / 100}%`);
    console.log('');

    // Save deployment results
    const deploymentData = {
      network: networkName,
      chainId: (await ethers.provider.getNetwork()).chainId.toString(),
      deployer: deployerAddress,
      timestamp: new Date().toISOString(),
      contracts: deploymentResults,
      gasUsage: {
        tokenFactory: gasUsed.tokenFactory.toString(),
        liquidityManager: gasUsed.liquidityManager.toString(),
        configuration: gasUsed.configuration.toString(),
        total: gasUsed.total.toString(),
        totalCost: totalCost.toString(),
      },
      parameters: DEPLOYMENT_PARAMS,
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment data
    const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log(`💾 Deployment data saved to: ${deploymentFile}`);

    // Generate environment variables
    const envVars = generateEnvVars(networkName, deploymentResults);
    const envFile = path.join(deploymentsDir, `${networkName}.env`);
    fs.writeFileSync(envFile, envVars);
    console.log(`🔧 Environment variables saved to: ${envFile}`);

    console.log('');
    console.log('🎉 Deployment completed successfully!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('1. Update your .env file with the new contract addresses');
    console.log('2. Verify contracts on the block explorer (run: npm run verify)');
    console.log('3. Update frontend configuration with new addresses');
    console.log('4. Test the deployment with the provided test scripts');
    console.log('');

  } catch (error) {
    console.error('❌ Deployment failed:');
    console.error(error.message);
    
    if (error.transaction) {
      console.error(`Transaction Hash: ${error.transaction.hash}`);
    }
    
    process.exit(1);
  }
}

function generateEnvVars(networkName, contracts) {
  const prefix = networkName.includes('mainnet') ? 'MAINNET' : 'TESTNET';
  
  return `# AB.LAND Contract Addresses - ${networkName.toUpperCase()}
# Generated on ${new Date().toISOString()}

${prefix}_TOKEN_FACTORY_ADDRESS=${contracts.tokenFactory.address}
${prefix}_LIQUIDITY_MANAGER_ADDRESS=${contracts.liquidityManager.address}

# React App Environment Variables
REACT_APP_TOKEN_FACTORY_ADDRESS=${contracts.tokenFactory.address}
REACT_APP_LIQUIDITY_MANAGER_ADDRESS=${contracts.liquidityManager.address}

# Transaction Hashes
${prefix}_TOKEN_FACTORY_TX=${contracts.tokenFactory.transactionHash}
${prefix}_LIQUIDITY_MANAGER_TX=${contracts.liquidityManager.transactionHash}
`;
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main, DEPLOYMENT_PARAMS, NETWORK_CONFIG };