import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';

interface Web3State {
  isConnected: boolean;
  account: string | null;
  balance: string;
  chainId: number | null;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  isConnecting: boolean;
  isLoading: boolean;
}

interface Web3Actions {
  connect: (connectorType: string) => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  getBalance: () => Promise<void>;
}

type UseWeb3Return = Web3State & Web3Actions;

// AB Chain configuration
const AB_CHAIN_CONFIG = {
  chainId: '0x2328', // 9000 in hex
  chainName: 'AB Chain',
  nativeCurrency: {
    name: 'AB Token',
    symbol: 'AB',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.abchain.com'],
  blockExplorerUrls: ['https://explorer.abchain.com'],
};

const SUPPORTED_CHAINS = {
  9000: 'AB Chain',
  1: 'Ethereum Mainnet',
  56: 'BSC Mainnet',
  137: 'Polygon Mainnet',
  42161: 'Arbitrum One',
};

export const useWeb3 = (): UseWeb3Return => {
  const [state, setState] = useState<Web3State>({
    isConnected: false,
    account: null,
    balance: '0.0',
    chainId: null,
    provider: null,
    signer: null,
    isConnecting: false,
    isLoading: true,
  });

  // Check if wallet is already connected
  const checkConnection = useCallback(async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const signer = provider.getSigner();
          const network = await provider.getNetwork();
          const balance = await provider.getBalance(accounts[0]);
          
          setState(prev => ({
            ...prev,
            isConnected: true,
            account: accounts[0],
            balance: ethers.utils.formatEther(balance),
            chainId: network.chainId,
            provider,
            signer,
            isLoading: false,
          }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Connect wallet
  const connect = useCallback(async (connectorType: string) => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('Please install MetaMask or another Web3 wallet');
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      let provider: ethers.providers.Web3Provider;
      
      switch (connectorType) {
        case 'injected':
        case 'ab-wallet':
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          provider = new ethers.providers.Web3Provider(window.ethereum);
          break;
        case 'walletconnect':
          // WalletConnect implementation would go here
          toast.info('WalletConnect integration coming soon!');
          setState(prev => ({ ...prev, isConnecting: false }));
          return;
        default:
          throw new Error('Unsupported connector type');
      }

      const signer = provider.getSigner();
      const account = await signer.getAddress();
      const network = await provider.getNetwork();
      const balance = await provider.getBalance(account);

      // Check if we're on AB Chain, if not, try to switch
      if (network.chainId !== 9000) {
        try {
          await switchToABChain();
          // Re-get network info after switch
          const newNetwork = await provider.getNetwork();
          setState(prev => ({
            ...prev,
            isConnected: true,
            account,
            balance: ethers.utils.formatEther(balance),
            chainId: newNetwork.chainId,
            provider,
            signer,
            isConnecting: false,
          }));
        } catch (switchError) {
          // If switch fails, still connect but show warning
          setState(prev => ({
            ...prev,
            isConnected: true,
            account,
            balance: ethers.utils.formatEther(balance),
            chainId: network.chainId,
            provider,
            signer,
            isConnecting: false,
          }));
          toast.warning(`Connected to ${SUPPORTED_CHAINS[network.chainId as keyof typeof SUPPORTED_CHAINS] || 'Unknown Network'}. Please switch to AB Chain for full functionality.`);
        }
      } else {
        setState(prev => ({
          ...prev,
          isConnected: true,
          account,
          balance: ethers.utils.formatEther(balance),
          chainId: network.chainId,
          provider,
          signer,
          isConnecting: false,
        }));
        toast.success('Wallet connected successfully!');
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setState(prev => ({ ...prev, isConnecting: false }));
      
      if (error.code === 4001) {
        toast.error('Connection rejected by user');
      } else {
        toast.error('Failed to connect wallet');
      }
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      account: null,
      balance: '0.0',
      chainId: null,
      provider: null,
      signer: null,
      isConnecting: false,
      isLoading: false,
    });
    toast.info('Wallet disconnected');
  }, []);

  // Switch to AB Chain
  const switchToABChain = async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('No wallet found');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AB_CHAIN_CONFIG.chainId }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [AB_CHAIN_CONFIG],
          });
        } catch (addError) {
          throw new Error('Failed to add AB Chain to wallet');
        }
      } else {
        throw switchError;
      }
    }
  };

  // Switch network
  const switchNetwork = useCallback(async (chainId: number) => {
    if (!state.provider) {
      toast.error('No wallet connected');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      console.error('Error switching network:', error);
      toast.error('Failed to switch network');
    }
  }, [state.provider]);

  // Get balance
  const getBalance = useCallback(async () => {
    if (!state.provider || !state.account) return;

    try {
      const balance = await state.provider.getBalance(state.account);
      setState(prev => ({
        ...prev,
        balance: ethers.utils.formatEther(balance),
      }));
    } catch (error) {
      console.error('Error getting balance:', error);
    }
  }, [state.provider, state.account]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else if (accounts[0] !== state.account) {
          setState(prev => ({ ...prev, account: accounts[0] }));
          getBalance();
        }
      };

      const handleChainChanged = (chainId: string) => {
        const newChainId = parseInt(chainId, 16);
        setState(prev => ({ ...prev, chainId: newChainId }));
        getBalance();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [state.account, disconnect, getBalance]);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Update balance periodically
  useEffect(() => {
    if (state.isConnected) {
      const interval = setInterval(getBalance, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [state.isConnected, getBalance]);

  return {
    ...state,
    connect,
    disconnect,
    switchNetwork,
    getBalance,
  };
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}