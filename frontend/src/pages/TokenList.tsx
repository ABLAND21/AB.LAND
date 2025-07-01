import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { formatAddress, formatNumber, formatTimeAgo } from '../utils/format';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
`;

const PageDescription = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const FilterSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  align-items: center;
  justify-content: space-between;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchInput = styled.input`
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  min-width: 300px;
  transition: all 0.2s ease;
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textSecondary};
    opacity: 0.5;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    min-width: auto;
    width: 100%;
  }
`;

const FilterSelect = styled.select`
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  min-width: 150px;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    min-width: auto;
    width: 100%;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const StatCard = styled.div`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: 16px;
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TokenGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const TokenCard = styled(Link)`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: 16px;
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  display: block;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const TokenHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const TokenIcon = styled.div<{ bgColor?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ bgColor, theme }) => 
    bgColor || `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
`;

const TokenInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TokenName = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TokenSymbol = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const TokenAddress = styled.span`
  font-family: monospace;
  background-color: ${({ theme }) => theme.colors.background};
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
`;

const TokenStats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const TokenStat = styled.div`
  text-align: center;
`;

const TokenStatValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const TokenStatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TokenDescription = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.4;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TokenFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const TokenAge = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const TokenBadge = styled.div<{ type: 'new' | 'trending' | 'verified' }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: ${({ type, theme }) => {
    switch (type) {
      case 'new': return theme.colors.success;
      case 'trending': return theme.colors.warning;
      case 'verified': return theme.colors.primary;
      default: return theme.colors.textSecondary;
    }
  }};
  color: white;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid ${({ theme }) => theme.colors.border};
  border-top: 4px solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  opacity: 0.5;
`;

const EmptyTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
`;

const EmptyDescription = styled.p`
  font-size: 1rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const CreateTokenButton = styled(Link)`
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.secondary});
  color: white;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
  }
`;

interface Token {
  id: string;
  address: string;
  name: string;
  symbol: string;
  description?: string;
  totalSupply: string;
  marketCap: string;
  volume24h: string;
  price: string;
  priceChange24h: number;
  holders: number;
  createdAt: string;
  creator: string;
  verified: boolean;
  trending: boolean;
  imageUrl?: string;
}

const TokenList: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');
  
  // Mock data for demonstration
  const mockTokens: Token[] = [
    {
      id: '1',
      address: '0x1234567890123456789012345678901234567890',
      name: 'Doge Killer',
      symbol: 'DOGEK',
      description: 'The ultimate meme coin that will surpass all others. Built on AB Chain for maximum efficiency and minimum fees.',
      totalSupply: '1000000000',
      marketCap: '2500000',
      volume24h: '150000',
      price: '0.0025',
      priceChange24h: 15.5,
      holders: 1250,
      createdAt: '2024-01-15T10:30:00Z',
      creator: '0xabcdef1234567890123456789012345678901234',
      verified: true,
      trending: true,
    },
    {
      id: '2',
      address: '0x2345678901234567890123456789012345678901',
      name: 'Moon Rocket',
      symbol: 'MOON',
      description: 'To the moon and beyond! This token is designed for diamond hands only.',
      totalSupply: '500000000',
      marketCap: '1800000',
      volume24h: '95000',
      price: '0.0036',
      priceChange24h: -8.2,
      holders: 890,
      createdAt: '2024-01-14T15:45:00Z',
      creator: '0xbcdef12345678901234567890123456789012345',
      verified: false,
      trending: false,
    },
    {
      id: '3',
      address: '0x3456789012345678901234567890123456789012',
      name: 'Pepe Classic',
      symbol: 'PEPEC',
      description: 'The original Pepe is back! Classic memes for classic gains.',
      totalSupply: '2000000000',
      marketCap: '3200000',
      volume24h: '220000',
      price: '0.0016',
      priceChange24h: 42.8,
      holders: 2100,
      createdAt: '2024-01-13T09:20:00Z',
      creator: '0xcdef123456789012345678901234567890123456',
      verified: true,
      trending: true,
    },
    {
      id: '4',
      address: '0x4567890123456789012345678901234567890123',
      name: 'Shiba Inu 2.0',
      symbol: 'SHIB2',
      description: 'The next generation of Shiba Inu with improved tokenomics and community features.',
      totalSupply: '1000000000000',
      marketCap: '950000',
      volume24h: '45000',
      price: '0.00000095',
      priceChange24h: 3.2,
      holders: 650,
      createdAt: '2024-01-12T14:10:00Z',
      creator: '0xdef1234567890123456789012345678901234567',
      verified: false,
      trending: false,
    },
    {
      id: '5',
      address: '0x5678901234567890123456789012345678901234',
      name: 'Wojak Coin',
      symbol: 'WOJAK',
      description: 'Feel the pain, embrace the gain. Wojak knows your trading struggles.',
      totalSupply: '100000000',
      marketCap: '750000',
      volume24h: '32000',
      price: '0.0075',
      priceChange24h: -12.5,
      holders: 420,
      createdAt: '2024-01-11T11:30:00Z',
      creator: '0xef12345678901234567890123456789012345678',
      verified: false,
      trending: false,
    },
    {
      id: '6',
      address: '0x6789012345678901234567890123456789012345',
      name: 'Chad Token',
      symbol: 'CHAD',
      description: 'Only chads hold this token. Are you chad enough?',
      totalSupply: '69420000',
      marketCap: '1200000',
      volume24h: '78000',
      price: '0.0173',
      priceChange24h: 25.7,
      holders: 1337,
      createdAt: '2024-01-10T16:45:00Z',
      creator: '0xf123456789012345678901234567890123456789',
      verified: true,
      trending: false,
    },
  ];
  
  useEffect(() => {
    // Simulate API call
    const loadTokens = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTokens(mockTokens);
      setFilteredTokens(mockTokens);
      setLoading(false);
    };
    
    loadTokens();
  }, []);
  
  useEffect(() => {
    let filtered = tokens.filter(token => {
      const matchesSearch = 
        token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = 
        filterBy === 'all' ||
        (filterBy === 'verified' && token.verified) ||
        (filterBy === 'trending' && token.trending) ||
        (filterBy === 'new' && new Date(token.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000));
      
      return matchesSearch && matchesFilter;
    });
    
    // Sort tokens
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'marketCap':
          return parseFloat(b.marketCap) - parseFloat(a.marketCap);
        case 'volume':
          return parseFloat(b.volume24h) - parseFloat(a.volume24h);
        case 'holders':
          return b.holders - a.holders;
        case 'priceChange':
          return b.priceChange24h - a.priceChange24h;
        default:
          return 0;
      }
    });
    
    setFilteredTokens(filtered);
  }, [tokens, searchTerm, sortBy, filterBy]);
  
  const getTokenBadge = (token: Token) => {
    if (token.verified) return { type: 'verified' as const, label: 'Verified' };
    if (token.trending) return { type: 'trending' as const, label: 'Trending' };
    if (new Date(token.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      return { type: 'new' as const, label: 'New' };
    }
    return null;
  };
  
  const totalStats = {
    totalTokens: tokens.length,
    totalMarketCap: tokens.reduce((sum, token) => sum + parseFloat(token.marketCap), 0),
    totalVolume: tokens.reduce((sum, token) => sum + parseFloat(token.volume24h), 0),
    totalHolders: tokens.reduce((sum, token) => sum + token.holders, 0),
  };
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Explore Meme Coins</PageTitle>
        <PageDescription>
          Discover the latest meme coins created on AB.LAND. Find the next moonshot or create your own!
        </PageDescription>
      </PageHeader>
      
      <StatsGrid>
        <StatCard>
          <StatValue>{totalStats.totalTokens}</StatValue>
          <StatLabel>Total Tokens</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>${formatNumber(totalStats.totalMarketCap)}</StatValue>
          <StatLabel>Total Market Cap</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>${formatNumber(totalStats.totalVolume)}</StatValue>
          <StatLabel>24h Volume</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{formatNumber(totalStats.totalHolders)}</StatValue>
          <StatLabel>Total Holders</StatLabel>
        </StatCard>
      </StatsGrid>
      
      <FilterSection>
        <FilterGroup>
          <SearchInput
            type="text"
            placeholder="Search tokens by name, symbol, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </FilterGroup>
        
        <FilterGroup>
          <FilterSelect value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
            <option value="all">All Tokens</option>
            <option value="verified">Verified Only</option>
            <option value="trending">Trending</option>
            <option value="new">New (24h)</option>
          </FilterSelect>
          
          <FilterSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="marketCap">Market Cap</option>
            <option value="volume">24h Volume</option>
            <option value="holders">Holders</option>
            <option value="priceChange">Price Change</option>
          </FilterSelect>
        </FilterGroup>
      </FilterSection>
      
      {loading ? (
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      ) : filteredTokens.length === 0 ? (
        <EmptyState>
          <EmptyIcon>🔍</EmptyIcon>
          <EmptyTitle>No tokens found</EmptyTitle>
          <EmptyDescription>
            {searchTerm || filterBy !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Be the first to create a meme coin on AB.LAND!'}
          </EmptyDescription>
          <CreateTokenButton to="/create">Create Your Token</CreateTokenButton>
        </EmptyState>
      ) : (
        <TokenGrid>
          {filteredTokens.map((token) => {
            const badge = getTokenBadge(token);
            return (
              <TokenCard key={token.id} to={`/token/${token.address}`}>
                <TokenHeader>
                  <TokenIcon>
                    {token.symbol.substring(0, 2)}
                  </TokenIcon>
                  <TokenInfo>
                    <TokenName>{token.name}</TokenName>
                    <TokenSymbol>
                      {token.symbol} • <TokenAddress>{formatAddress(token.address)}</TokenAddress>
                    </TokenSymbol>
                  </TokenInfo>
                  {badge && (
                    <TokenBadge type={badge.type}>{badge.label}</TokenBadge>
                  )}
                </TokenHeader>
                
                {token.description && (
                  <TokenDescription>{token.description}</TokenDescription>
                )}
                
                <TokenStats>
                  <TokenStat>
                    <TokenStatValue>${formatNumber(parseFloat(token.marketCap))}</TokenStatValue>
                    <TokenStatLabel>Market Cap</TokenStatLabel>
                  </TokenStat>
                  <TokenStat>
                    <TokenStatValue>${formatNumber(parseFloat(token.volume24h))}</TokenStatValue>
                    <TokenStatLabel>24h Volume</TokenStatLabel>
                  </TokenStat>
                  <TokenStat>
                    <TokenStatValue>${token.price}</TokenStatValue>
                    <TokenStatLabel>Price</TokenStatLabel>
                  </TokenStat>
                  <TokenStat>
                    <TokenStatValue 
                      style={{ 
                        color: token.priceChange24h >= 0 ? '#10b981' : '#ef4444' 
                      }}
                    >
                      {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                    </TokenStatValue>
                    <TokenStatLabel>24h Change</TokenStatLabel>
                  </TokenStat>
                </TokenStats>
                
                <TokenFooter>
                  <TokenAge>Created {formatTimeAgo(token.createdAt)}</TokenAge>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {formatNumber(token.holders)} holders
                  </div>
                </TokenFooter>
              </TokenCard>
            );
          })}
        </TokenGrid>
      )}
    </PageContainer>
  );
};

export default TokenList;