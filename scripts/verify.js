const { run, network } = require('hardhat');
const fs = require('fs');
const path = require('path');

// Delay function for rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Verification delay between contracts (to avoid rate limiting)
const VERIFICATION_DELAY = 10000; // 10 seconds

// Maximum retry attempts
const MAX_RETRIES = 3;

// Supported networks for verification
const SUPPORTED_NETWORKS = [
  'abchain-testnet',
  'abchain-mainnet',
  'sepolia',
  'mainnet'
];

async function verifyContract(contractAddress, constructorArguments, contractName, retryCount = 0) {
  try {
    console.log(`🔍 Verifying ${contractName} at ${contractAddress}...`);
    
    await run('verify:verify', {
      address: contractAddress,
      constructorArguments: constructorArguments,
    });
    
    console.log(`✅ ${contractName} verified successfully!`);
    return true;
    
  } catch (error) {
    if (error.message.includes('Already Verified')) {
      console.log(`ℹ️  ${contractName} is already verified`);
      return true;
    }
    
    if (error.message.includes('rate limit') && retryCount < MAX_RETRIES) {
      console.log(`⏳ Rate limited, retrying in 30 seconds... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await delay(30000);
      return verifyContract(contractAddress, constructorArguments, contractName, retryCount + 1);
    }
    
    if (error.message.includes('Bytecode does not match')) {
      console.log(`⚠️  ${contractName} bytecode does not match - this might be due to compiler settings`);
      console.log('   Try recompiling with the exact same settings used for deployment');
      return false;
    }
    
    console.error(`❌ Failed to verify ${contractName}:`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function loadDeploymentData(networkName) {
  const deploymentFile = path.join(__dirname, '..', 'deployments', `${networkName}.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  return deploymentData;
}

async function main() {
  console.log('🔍 Starting AB.LAND Smart Contract Verification');
  console.log('=' .repeat(60));
  
  const networkName = network.name;
  
  // Check if network supports verification
  if (!SUPPORTED_NETWORKS.includes(networkName)) {
    console.log(`⚠️  Network ${networkName} does not support contract verification`);
    console.log('Supported networks:', SUPPORTED_NETWORKS.join(', '));
    return;
  }
  
  console.log(`📡 Network: ${networkName}`);
  console.log('');
  
  try {
    // Load deployment data
    console.log('📂 Loading deployment data...');
    const deploymentData = await loadDeploymentData(networkName);
    
    console.log(`   Deployment found for network: ${deploymentData.network}`);
    console.log(`   Chain ID: ${deploymentData.chainId}`);
    console.log(`   Deployed by: ${deploymentData.deployer}`);
    console.log(`   Deployment time: ${deploymentData.timestamp}`);
    console.log('');
    
    const contracts = deploymentData.contracts;
    const parameters = deploymentData.parameters;
    
    if (!contracts.tokenFactory || !contracts.liquidityManager) {
      throw new Error('Missing contract addresses in deployment data');
    }
    
    // Verify ABTokenFactory
    console.log('🔍 Verifying ABTokenFactory...');
    const tokenFactoryArgs = [
      parameters.tokenFactory.creationFee,
      parameters.tokenFactory.feeRecipient
    ];
    
    console.log('   Constructor arguments:');
    console.log(`     creationFee: ${parameters.tokenFactory.creationFee}`);
    console.log(`     feeRecipient: ${parameters.tokenFactory.feeRecipient}`);
    console.log('');
    
    const tokenFactoryVerified = await verifyContract(
      contracts.tokenFactory.address,
      tokenFactoryArgs,
      'ABTokenFactory'
    );
    
    // Wait before verifying next contract
    if (tokenFactoryVerified) {
      console.log(`⏳ Waiting ${VERIFICATION_DELAY / 1000} seconds before next verification...`);
      await delay(VERIFICATION_DELAY);
    }
    
    // Verify ABLiquidityManager
    console.log('🔍 Verifying ABLiquidityManager...');
    const liquidityManagerArgs = [
      contracts.tokenFactory.address,
      parameters.liquidityManager.swapFee,
      parameters.liquidityManager.protocolFee,
      deploymentData.deployer // fee recipient
    ];
    
    console.log('   Constructor arguments:');
    console.log(`     tokenFactory: ${contracts.tokenFactory.address}`);
    console.log(`     swapFee: ${parameters.liquidityManager.swapFee}`);
    console.log(`     protocolFee: ${parameters.liquidityManager.protocolFee}`);
    console.log(`     feeRecipient: ${deploymentData.deployer}`);
    console.log('');
    
    const liquidityManagerVerified = await verifyContract(
      contracts.liquidityManager.address,
      liquidityManagerArgs,
      'ABLiquidityManager'
    );
    
    // Summary
    console.log('📋 Verification Summary:');
    console.log('=' .repeat(60));
    console.log(`Network: ${networkName}`);
    console.log('');
    console.log('📦 Contract Verification Status:');
    console.log(`   ABTokenFactory: ${tokenFactoryVerified ? '✅ Verified' : '❌ Failed'}`);
    console.log(`   ABLiquidityManager: ${liquidityManagerVerified ? '✅ Verified' : '❌ Failed'}`);
    console.log('');
    
    if (tokenFactoryVerified && liquidityManagerVerified) {
      console.log('🎉 All contracts verified successfully!');
      
      // Generate explorer links
      const explorerUrls = getExplorerUrls(networkName);
      if (explorerUrls.base) {
        console.log('');
        console.log('🔗 Explorer Links:');
        console.log(`   ABTokenFactory: ${explorerUrls.base}/address/${contracts.tokenFactory.address}`);
        console.log(`   ABLiquidityManager: ${explorerUrls.base}/address/${contracts.liquidityManager.address}`);
      }
      
    } else {
      console.log('⚠️  Some contracts failed verification');
      console.log('');
      console.log('💡 Troubleshooting Tips:');
      console.log('1. Ensure you are using the same compiler version and settings');
      console.log('2. Check that constructor arguments match exactly');
      console.log('3. Wait a few minutes and try again (explorer indexing delay)');
      console.log('4. Verify manually on the block explorer if automatic verification fails');
    }
    
    // Save verification results
    const verificationResults = {
      network: networkName,
      timestamp: new Date().toISOString(),
      results: {
        tokenFactory: {
          address: contracts.tokenFactory.address,
          verified: tokenFactoryVerified,
          constructorArgs: tokenFactoryArgs
        },
        liquidityManager: {
          address: contracts.liquidityManager.address,
          verified: liquidityManagerVerified,
          constructorArgs: liquidityManagerArgs
        }
      }
    };
    
    const verificationsDir = path.join(__dirname, '..', 'deployments');
    const verificationFile = path.join(verificationsDir, `${networkName}-verification.json`);
    fs.writeFileSync(verificationFile, JSON.stringify(verificationResults, null, 2));
    console.log('');
    console.log(`💾 Verification results saved to: ${verificationFile}`);
    
  } catch (error) {
    console.error('❌ Verification failed:');
    console.error(error.message);
    
    if (error.message.includes('Deployment file not found')) {
      console.log('');
      console.log('💡 Make sure to deploy contracts first:');
      console.log(`   npx hardhat run scripts/deploy.js --network ${networkName}`);
    }
    
    process.exit(1);
  }
}

function getExplorerUrls(networkName) {
  const explorerUrls = {
    'abchain-testnet': {
      base: 'https://testnet-explorer.abchain.com',
      api: 'https://testnet-explorer.abchain.com/api'
    },
    'abchain-mainnet': {
      base: 'https://explorer.abchain.com',
      api: 'https://explorer.abchain.com/api'
    },
    'sepolia': {
      base: 'https://sepolia.etherscan.io',
      api: 'https://api-sepolia.etherscan.io/api'
    },
    'mainnet': {
      base: 'https://etherscan.io',
      api: 'https://api.etherscan.io/api'
    }
  };
  
  return explorerUrls[networkName] || {};
}

// Manual verification function for specific contracts
async function verifySpecific(contractName, contractAddress, constructorArgs) {
  console.log(`🔍 Manual verification for ${contractName}`);
  console.log(`Address: ${contractAddress}`);
  console.log(`Constructor args: ${JSON.stringify(constructorArgs)}`);
  console.log('');
  
  const verified = await verifyContract(contractAddress, constructorArgs, contractName);
  
  if (verified) {
    console.log(`✅ ${contractName} verified successfully!`);
  } else {
    console.log(`❌ Failed to verify ${contractName}`);
  }
}

// Handle script execution
if (require.main === module) {
  // Check for manual verification arguments
  const args = process.argv.slice(2);
  
  if (args.length >= 2 && args[0] === '--manual') {
    // Manual verification mode
    // Usage: node verify.js --manual <contractName> <address> [constructorArg1] [constructorArg2] ...
    const contractName = args[1];
    const contractAddress = args[2];
    const constructorArgs = args.slice(3);
    
    verifySpecific(contractName, contractAddress, constructorArgs)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else {
    // Normal verification mode
    main()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
}

module.exports = { main, verifyContract, verifySpecific };