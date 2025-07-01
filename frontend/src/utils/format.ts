import { ethers } from 'ethers';

/**
 * Format wallet address to show first 6 and last 4 characters
 * @param address - The wallet address to format
 * @param startLength - Number of characters to show at start (default: 6)
 * @param endLength - Number of characters to show at end (default: 4)
 * @returns Formatted address string
 */
export const formatAddress = (
  address: string,
  startLength: number = 6,
  endLength: number = 4
): string => {
  if (!address) return '';
  if (address.length <= startLength + endLength) return address;
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

/**
 * Format token amount with proper decimals
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 18)
 * @param displayDecimals - Number of decimals to display (default: 4)
 * @returns Formatted amount string
 */
export const formatTokenAmount = (
  amount: string | number,
  decimals: number = 18,
  displayDecimals: number = 4
): string => {
  try {
    const formatted = ethers.utils.formatUnits(amount.toString(), decimals);
    const num = parseFloat(formatted);
    
    if (num === 0) return '0';
    if (num < 0.0001) return '<0.0001';
    
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: displayDecimals,
    });
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
};

/**
 * Format large numbers with K, M, B suffixes
 * @param num - The number to format
 * @param decimals - Number of decimal places to show (default: 1)
 * @returns Formatted number string
 */
export const formatLargeNumber = (num: number, decimals: number = 1): string => {
  if (num === 0) return '0';
  
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (absNum >= 1e9) {
    return `${sign}${(absNum / 1e9).toFixed(decimals)}B`;
  }
  if (absNum >= 1e6) {
    return `${sign}${(absNum / 1e6).toFixed(decimals)}M`;
  }
  if (absNum >= 1e3) {
    return `${sign}${(absNum / 1e3).toFixed(decimals)}K`;
  }
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format percentage with proper sign and decimals
 * @param value - The percentage value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

/**
 * Format USD currency
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

/**
 * Format time ago from timestamp
 * @param timestamp - Unix timestamp in seconds
 * @returns Human readable time ago string
 */
export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  
  if (diff < 60) {
    return 'Just now';
  }
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes}m ago`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours}h ago`;
  }
  if (diff < 2592000) {
    const days = Math.floor(diff / 86400);
    return `${days}d ago`;
  }
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format date to readable string
 * @param timestamp - Unix timestamp in seconds or Date object
 * @param includeTime - Whether to include time (default: false)
 * @returns Formatted date string
 */
export const formatDate = (timestamp: number | Date, includeTime: boolean = false): string => {
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : timestamp;
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('en-US', options);
};

/**
 * Format transaction hash
 * @param hash - The transaction hash
 * @param length - Number of characters to show on each side (default: 6)
 * @returns Formatted hash string
 */
export const formatTxHash = (hash: string, length: number = 6): string => {
  if (!hash) return '';
  if (hash.length <= length * 2) return hash;
  
  return `${hash.slice(0, length)}...${hash.slice(-length)}`;
};

/**
 * Format market cap
 * @param marketCap - Market cap value
 * @returns Formatted market cap string
 */
export const formatMarketCap = (marketCap: number): string => {
  if (marketCap === 0) return 'N/A';
  return formatCurrency(marketCap, 0);
};

/**
 * Format volume with appropriate suffix
 * @param volume - Volume value
 * @returns Formatted volume string
 */
export const formatVolume = (volume: number): string => {
  if (volume === 0) return '$0';
  return `$${formatLargeNumber(volume)}`;
};

/**
 * Validate and format token symbol
 * @param symbol - Token symbol to format
 * @returns Formatted symbol string
 */
export const formatTokenSymbol = (symbol: string): string => {
  if (!symbol) return '';
  return symbol.toUpperCase().trim();
};

/**
 * Format token name
 * @param name - Token name to format
 * @returns Formatted name string
 */
export const formatTokenName = (name: string): string => {
  if (!name) return '';
  return name.trim();
};

/**
 * Format price with dynamic decimals based on value
 * @param price - Price value
 * @returns Formatted price string
 */
export const formatPrice = (price: number): string => {
  if (price === 0) return '$0.00';
  if (price < 0.01) return `$${price.toExponential(2)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  if (price < 100) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(0)}`;
};

/**
 * Format gas price in Gwei
 * @param gasPrice - Gas price in wei
 * @returns Formatted gas price string
 */
export const formatGasPrice = (gasPrice: string): string => {
  try {
    const gwei = ethers.utils.formatUnits(gasPrice, 'gwei');
    return `${parseFloat(gwei).toFixed(1)} Gwei`;
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Format file size
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format APY (Annual Percentage Yield)
 * @param apy - APY value as decimal (e.g., 0.15 for 15%)
 * @returns Formatted APY string
 */
export const formatAPY = (apy: number): string => {
  return `${(apy * 100).toFixed(2)}%`;
};

/**
 * Format liquidity value
 * @param liquidity - Liquidity value
 * @returns Formatted liquidity string
 */
export const formatLiquidity = (liquidity: number): string => {
  if (liquidity === 0) return '$0';
  return formatVolume(liquidity);
};