import { ethers } from 'ethers';
import { logger } from '../utils/logger';

// AB Chain configuration
const AB_CHAIN_CONFIG = {
  chainId: 9000,
  name: 'AB Chain',
  rpcUrl: process.env.AB_CHAIN_RPC_URL || 'https://rpc.abchain.com',
  explorerUrl: process.env.AB_CHAIN_EXPLORER_URL || 'https://explorer.abchain.com',
  nativeCurrency: {
    name: 'AB',
    symbol: 'AB',
    decimals: 18
  }
};

// Contract addresses
const CONTRACT_ADDRESSES = {
  TOKEN_FACTORY: process.env.TOKEN_FACTORY_ADDRESS || '0x1234567890123456789012345678901234567890',
  LIQUIDITY_MANAGER: process.env.LIQUIDITY_MANAGER_ADDRESS || '0x2345678901234567890123456789012345678901',
  MULTICALL: process.env.MULTICALL_ADDRESS || '0x3456789012345678901234567890123456789012'
};

// Contract ABIs (simplified for demo)
const TOKEN_FACTORY_ABI = [
  'event TokenCreated(address indexed tokenAddress, string name, string symbol, uint256 totalSupply, address indexed creator)',
  'function createToken(string memory name, string memory symbol, uint256 totalSupply, uint8 decimals, string memory description, string memory imageUrl, string memory website, string memory telegram, string memory twitter) external payable returns (address)',
  'function getTokens() external view returns (address[] memory)',
  'function getTokenInfo(address tokenAddress) external view returns (tuple(string name, string symbol, uint256 totalSupply, uint8 decimals, address creator, string description, string imageUrl, string website, string telegram, string twitter))'
];

const ERC20_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

const LIQUIDITY_MANAGER_ABI = [
  'function createPool(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external payable returns (address pool)',
  'function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external payable returns (uint256 amountAUsed, uint256 amountBUsed, uint256 liquidity)',
  'function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB)',
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)',
  'function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)',
  'function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB)',
  'event PoolCreated(address indexed tokenA, address indexed tokenB, address pool)',
  'event LiquidityAdded(address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB, uint256 liquidity)',
  'event Swap(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, address indexed to)'
];

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private tokenFactoryContract: ethers.Contract;
  private liquidityManagerContract: ethers.Contract;
  private isInitialized: boolean = false;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(AB_CHAIN_CONFIG.rpcUrl);
    this.tokenFactoryContract = new ethers.Contract(
      CONTRACT_ADDRESSES.TOKEN_FACTORY,
      TOKEN_FACTORY_ABI,
      this.provider
    );
    this.liquidityManagerContract = new ethers.Contract(
      CONTRACT_ADDRESSES.LIQUIDITY_MANAGER,
      LIQUIDITY_MANAGER_ABI,
      this.provider
    );
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      const network = await this.provider.getNetwork();
      logger.info(`Connected to AB Chain (Chain ID: ${network.chainId})`);

      // Verify contract addresses
      const factoryCode = await this.provider.getCode(CONTRACT_ADDRESSES.TOKEN_FACTORY);
      const liquidityCode = await this.provider.getCode(CONTRACT_ADDRESSES.LIQUIDITY_MANAGER);

      if (factoryCode === '0x') {
        logger.warn('Token Factory contract not found at specified address');
      }

      if (liquidityCode === '0x') {
        logger.warn('Liquidity Manager contract not found at specified address');
      }

      this.isInitialized = true;
      logger.info('Blockchain service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async getTokenAddressFromTransaction(txHash: string): Promise<string | null> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        logger.warn(`Transaction not found: ${txHash}`);
        return null;
      }

      if (receipt.status !== 1) {
        logger.warn(`Transaction failed: ${txHash}`);
        return null;
      }

      // Parse logs to find TokenCreated event
      const iface = new ethers.Interface(TOKEN_FACTORY_ABI);
      
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (parsed && parsed.name === 'TokenCreated') {
            return parsed.args.tokenAddress;
          }
        } catch (e) {
          // Log might not be from our contract
          continue;
        }
      }

      logger.warn(`TokenCreated event not found in transaction: ${txHash}`);
      return null;
    } catch (error) {
      logger.error(`Error getting token address from transaction ${txHash}:`, error);
      return null;
    }
  }

  async getTokenData(tokenAddress: string): Promise<any | null> {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply()
      ]);

      // Get additional data (price, market cap, etc.)
      // This would typically come from a price oracle or DEX
      const mockPrice = '0.0025'; // Mock price for demo
      const mockVolume24h = '15000'; // Mock volume for demo
      const mockPriceChange24h = 5.2; // Mock price change for demo
      const mockHolders = 150; // Mock holders count for demo
      
      const marketCap = (parseFloat(mockPrice) * parseFloat(ethers.formatUnits(totalSupply, decimals))).toString();

      return {
        name,
        symbol,
        decimals,
        totalSupply: totalSupply.toString(),
        price: mockPrice,
        marketCap,
        volume24h: mockVolume24h,
        priceChange24h: mockPriceChange24h,
        holders: mockHolders
      };
    } catch (error) {
      logger.error(`Error getting token data for ${tokenAddress}:`, error);
      return null;
    }
  }

  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const balance = await tokenContract.balanceOf(userAddress);
      const decimals = await tokenContract.decimals();
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      logger.error(`Error getting token balance for ${tokenAddress}:`, error);
      return '0';
    }
  }

  async getTokenHolders(tokenAddress: string): Promise<any[]> {
    try {
      // This would typically require indexing Transfer events
      // For demo purposes, return mock data
      return [
        {
          address: '0x1234567890123456789012345678901234567890',
          balance: '1000000000000000000000',
          percentage: 10.5
        },
        {
          address: '0x2345678901234567890123456789012345678901',
          balance: '500000000000000000000',
          percentage: 5.25
        }
      ];
    } catch (error) {
      logger.error(`Error getting token holders for ${tokenAddress}:`, error);
      return [];
    }
  }

  async getTokenTransactions(tokenAddress: string, limit: number = 10): Promise<any[]> {
    try {
      // This would typically require indexing Transfer events
      // For demo purposes, return mock data
      return [
        {
          hash: '0xabcdef1234567890123456789012345678901234567890123456789012345678',
          from: '0x1234567890123456789012345678901234567890',
          to: '0x2345678901234567890123456789012345678901',
          value: '1000000000000000000',
          timestamp: Date.now() - 3600000,
          type: 'transfer'
        }
      ];
    } catch (error) {
      logger.error(`Error getting token transactions for ${tokenAddress}:`, error);
      return [];
    }
  }

  async getLiquidityPools(tokenAddress: string): Promise<any[]> {
    try {
      // This would query the liquidity manager for pools containing this token
      // For demo purposes, return mock data
      return [
        {
          address: '0x3456789012345678901234567890123456789012',
          tokenA: tokenAddress,
          tokenB: '0x0000000000000000000000000000000000000000', // Native token
          reserveA: '1000000000000000000000',
          reserveB: '2500000000000000000',
          totalLiquidity: '50000000000000000000',
          volume24h: '10000000000000000000'
        }
      ];
    } catch (error) {
      logger.error(`Error getting liquidity pools for ${tokenAddress}:`, error);
      return [];
    }
  }

  async getSwapQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Promise<{ amountOut: string; priceImpact: number } | null> {
    try {
      const path = [tokenIn, tokenOut];
      const amounts = await this.liquidityManagerContract.getAmountsOut(
        ethers.parseUnits(amountIn, 18),
        path
      );
      
      const amountOut = ethers.formatUnits(amounts[1], 18);
      const priceImpact = 0.5; // Mock price impact
      
      return {
        amountOut,
        priceImpact
      };
    } catch (error) {
      logger.error('Error getting swap quote:', error);
      return null;
    }
  }

  async getGasPrice(): Promise<string> {
    try {
      const gasPrice = await this.provider.getFeeData();
      return ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei');
    } catch (error) {
      logger.error('Error getting gas price:', error);
      return '1'; // Default 1 gwei
    }
  }

  async getBlockNumber(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      logger.error('Error getting block number:', error);
      return 0;
    }
  }

  async getTransactionReceipt(txHash: string): Promise<any | null> {
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      logger.error(`Error getting transaction receipt for ${txHash}:`, error);
      return null;
    }
  }

  async validateAddress(address: string): Promise<boolean> {
    try {
      return ethers.isAddress(address);
    } catch (error) {
      return false;
    }
  }

  async isContract(address: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      logger.error(`Error checking if address is contract: ${address}`, error);
      return false;
    }
  }

  getExplorerUrl(type: 'tx' | 'address' | 'token', value: string): string {
    const baseUrl = AB_CHAIN_CONFIG.explorerUrl;
    switch (type) {
      case 'tx':
        return `${baseUrl}/tx/${value}`;
      case 'address':
        return `${baseUrl}/address/${value}`;
      case 'token':
        return `${baseUrl}/token/${value}`;
      default:
        return baseUrl;
    }
  }

  // Event listeners for real-time updates
  setupEventListeners(): void {
    try {
      // Listen for new token creations
      this.tokenFactoryContract.on('TokenCreated', (tokenAddress, name, symbol, totalSupply, creator, event) => {
        logger.info(`New token created: ${name} (${symbol}) at ${tokenAddress} by ${creator}`);
        
        // Emit to WebSocket clients
        const { io } = require('../index');
        io.emit('newTokenCreated', {
          address: tokenAddress,
          name,
          symbol,
          totalSupply: totalSupply.toString(),
          creator,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });

      // Listen for liquidity events
      this.liquidityManagerContract.on('PoolCreated', (tokenA, tokenB, pool, event) => {
        logger.info(`New liquidity pool created: ${tokenA}/${tokenB} at ${pool}`);
        
        const { io } = require('../index');
        io.emit('newPoolCreated', {
          tokenA,
          tokenB,
          pool,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });

      logger.info('Blockchain event listeners setup successfully');
    } catch (error) {
      logger.error('Error setting up event listeners:', error);
    }
  }

  // Cleanup method
  cleanup(): void {
    try {
      this.tokenFactoryContract.removeAllListeners();
      this.liquidityManagerContract.removeAllListeners();
      logger.info('Blockchain service cleanup completed');
    } catch (error) {
      logger.error('Error during blockchain service cleanup:', error);
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();

// Initialize function
export const initializeBlockchainService = async (): Promise<void> => {
  await blockchainService.initialize();
  blockchainService.setupEventListeners();
};

// Cleanup function
export const cleanupBlockchainService = (): void => {
  blockchainService.cleanup();
};