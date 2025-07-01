import React, { useState } from 'react';
import styled from 'styled-components';
import { useWeb3 } from '../hooks/useWeb3';
import { formatAddress } from '../utils/format';

const WalletButton = styled.button<{ isConnected: boolean }>`
  background: ${({ theme, isConnected }) => 
    isConnected 
      ? `linear-gradient(135deg, ${theme.colors.success}, ${theme.colors.primary})`
      : `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`
  };
  color: white;
  border: none;
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 120px;
  justify-content: center;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    font-size: 0.8rem;
    min-width: 100px;
  }
`;

const WalletModal = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: ${({ isOpen }) => isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: 16px;
  padding: ${({ theme }) => theme.spacing.xl};
  max-width: 400px;
  width: 90%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ModalTitle = styled.h3`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 1.5rem;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background-color: ${({ theme }) => theme.colors.surfaceLight};
  }
`;

const WalletOption = styled.button`
  width: 100%;
  background-color: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};

  &:hover {
    background-color: ${({ theme }) => theme.colors.border};
    transform: translateY(-1px);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const WalletIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.secondary});
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
`;

const WalletInfo = styled.div`
  flex: 1;
  text-align: left;
`;

const WalletName = styled.div`
  font-weight: 600;
  margin-bottom: 2px;
`;

const WalletDescription = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const AccountDropdown = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.sm};
  min-width: 200px;
  display: ${({ isOpen }) => isOpen ? 'block' : 'none'};
  z-index: 1000;
  margin-top: ${({ theme }) => theme.spacing.xs};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
`;

const DropdownItem = styled.button`
  width: 100%;
  background: none;
  border: none;
  padding: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surfaceLight};
  }
`;

const WalletContainer = styled.div`
  position: relative;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  background-color: ${({ theme }) => theme.colors.success};
  border-radius: 50%;
  margin-right: ${({ theme }) => theme.spacing.xs};
`;

const WalletConnector: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { 
    isConnected, 
    account, 
    balance, 
    connect, 
    disconnect, 
    isConnecting 
  } = useWeb3();

  const walletOptions = [
    {
      name: 'MetaMask',
      description: 'Connect using browser wallet',
      icon: 'M',
      connector: 'injected'
    },
    {
      name: 'WalletConnect',
      description: 'Connect using mobile wallet',
      icon: 'W',
      connector: 'walletconnect'
    },
    {
      name: 'AB Wallet',
      description: 'Native AB Chain wallet',
      icon: 'AB',
      connector: 'ab-wallet'
    }
  ];

  const handleConnect = async (connectorType: string) => {
    try {
      await connect(connectorType);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsDropdownOpen(false);
  };

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setIsDropdownOpen(false);
    }
  };

  if (isConnected && account) {
    return (
      <WalletContainer>
        <WalletButton
          isConnected={true}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <StatusDot />
          {formatAddress(account)}
        </WalletButton>
        
        <AccountDropdown isOpen={isDropdownOpen}>
          <DropdownItem onClick={copyAddress}>
            📋 Copy Address
          </DropdownItem>
          <DropdownItem onClick={() => setIsDropdownOpen(false)}>
            💰 Balance: {balance} AB
          </DropdownItem>
          <DropdownItem onClick={handleDisconnect}>
            🚪 Disconnect
          </DropdownItem>
        </AccountDropdown>
      </WalletContainer>
    );
  }

  return (
    <>
      <WalletButton
        isConnected={false}
        onClick={() => setIsModalOpen(true)}
        disabled={isConnecting}
      >
        {isConnecting ? '🔄 Connecting...' : '🔗 Connect Wallet'}
      </WalletButton>

      <WalletModal isOpen={isModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Connect Wallet</ModalTitle>
            <CloseButton onClick={() => setIsModalOpen(false)}>
              ✕
            </CloseButton>
          </ModalHeader>

          {walletOptions.map((wallet) => (
            <WalletOption
              key={wallet.connector}
              onClick={() => handleConnect(wallet.connector)}
            >
              <WalletIcon>{wallet.icon}</WalletIcon>
              <WalletInfo>
                <WalletName>{wallet.name}</WalletName>
                <WalletDescription>{wallet.description}</WalletDescription>
              </WalletInfo>
            </WalletOption>
          ))}
        </ModalContent>
      </WalletModal>
    </>
  );
};

export default WalletConnector;