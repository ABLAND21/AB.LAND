import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../hooks/useWeb3';

const PageContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
  text-align: center;
`;

const PageDescription = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const FormCard = styled.div`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: 16px;
  padding: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const FormSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
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
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  transition: all 0.2s ease;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textSecondary};
    opacity: 0.5;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
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
`;

const HelperText = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const SubmitButton = styled.button`
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.secondary});
  color: white;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.xl};
  border-radius: 12px;
  font-weight: 600;
  font-size: 1.1rem;
  width: 100%;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  margin-top: ${({ theme }) => theme.spacing.md};
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FeeCard = styled.div`
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const FeeRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  
  &:last-child {
    margin-bottom: 0;
    padding-top: ${({ theme }) => theme.spacing.xs};
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    font-weight: 600;
  }
`;

const FeeLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FeeValue = styled.span`
  color: ${({ theme }) => theme.colors.text};
`;

const ProgressSteps = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 15px;
    left: 0;
    right: 0;
    height: 2px;
    background-color: ${({ theme }) => theme.colors.border};
    z-index: 0;
  }
`;

const Step = styled.div<{ active: boolean; completed: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
`;

const StepCircle = styled.div<{ active: boolean; completed: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  background-color: ${({ theme, active, completed }) => 
    completed 
      ? theme.colors.success 
      : active 
        ? theme.colors.primary 
        : theme.colors.surfaceLight};
  color: ${({ theme, active, completed }) => 
    completed || active ? 'white' : theme.colors.textSecondary};
  transition: all 0.3s ease;
`;

const StepLabel = styled.div<{ active: boolean }>`
  font-size: 0.875rem;
  color: ${({ theme, active }) => 
    active ? theme.colors.text : theme.colors.textSecondary};
  text-align: center;
  max-width: 100px;
`;

const PreviewCard = styled.div`
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 16px;
  padding: ${({ theme }) => theme.spacing.xl};
  margin-top: ${({ theme }) => theme.spacing.xl};
  border: 1px solid ${({ theme }) => theme.colors.border};
  text-align: center;
`;

const TokenIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.secondary});
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  color: white;
  margin: 0 auto ${({ theme }) => theme.spacing.md};
`;

const TokenName = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.text};
`;

const TokenSymbol = styled.div`
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const TokenDetail = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.sm} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const TokenDetailLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const TokenDetailValue = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`;

const SuccessCard = styled.div`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: 16px;
  padding: ${({ theme }) => theme.spacing.xl};
  margin-top: ${({ theme }) => theme.spacing.xl};
  border: 1px solid ${({ theme }) => theme.colors.success};
  text-align: center;
`;

const SuccessIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.success};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
  margin: 0 auto ${({ theme }) => theme.spacing.md};
`;

const SuccessTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
`;

const SuccessDescription = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
  }
`;

const PrimaryButton = styled.button`
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.secondary});
  color: white;
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  flex: 1;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
`;

const SecondaryButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background-color: rgba(99, 102, 241, 0.1);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
`;

const CreateToken: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, account, provider, signer, chainId } = useWeb3();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdTokenAddress, setCreatedTokenAddress] = useState('');
  
  // Form state
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenSupply, setTokenSupply] = useState('');
  const [tokenDecimals, setTokenDecimals] = useState('18');
  const [tokenDescription, setTokenDescription] = useState('');
  const [tokenImageUrl, setTokenImageUrl] = useState('');
  const [tokenWebsite, setTokenWebsite] = useState('');
  const [tokenTelegram, setTokenTelegram] = useState('');
  const [tokenTwitter, setTokenTwitter] = useState('');
  
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Check if user is connected
  useEffect(() => {
    if (!isConnected) {
      toast.warning('Please connect your wallet to create a token');
    }
    
    // Check if on AB Chain
    if (isConnected && chainId !== 9000) {
      toast.warning('Please switch to AB Chain to create a token');
    }
  }, [isConnected, chainId]);
  
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!tokenName.trim()) {
      newErrors.tokenName = 'Token name is required';
    } else if (tokenName.length > 50) {
      newErrors.tokenName = 'Token name must be less than 50 characters';
    }
    
    if (!tokenSymbol.trim()) {
      newErrors.tokenSymbol = 'Token symbol is required';
    } else if (tokenSymbol.length > 10) {
      newErrors.tokenSymbol = 'Token symbol must be less than 10 characters';
    }
    
    if (!tokenSupply.trim()) {
      newErrors.tokenSupply = 'Total supply is required';
    } else if (isNaN(Number(tokenSupply)) || Number(tokenSupply) <= 0) {
      newErrors.tokenSupply = 'Total supply must be a positive number';
    } else if (Number(tokenSupply) > 1e15) {
      newErrors.tokenSupply = 'Total supply must be less than 1 quadrillion';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    if (tokenDescription.length > 500) {
      newErrors.tokenDescription = 'Description must be less than 500 characters';
    }
    
    if (tokenImageUrl && !isValidUrl(tokenImageUrl)) {
      newErrors.tokenImageUrl = 'Please enter a valid URL';
    }
    
    if (tokenWebsite && !isValidUrl(tokenWebsite)) {
      newErrors.tokenWebsite = 'Please enter a valid URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };
  
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleCreateToken = async () => {
    if (!isConnected || !signer) {
      toast.error('Please connect your wallet');
      return;
    }
    
    if (chainId !== 9000) {
      toast.error('Please switch to AB Chain');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // This would be the actual implementation with the contract
      // const tokenFactory = new ethers.Contract(TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, signer);
      // const tx = await tokenFactory.createToken(
      //   tokenName,
      //   tokenSymbol,
      //   tokenSupply,
      //   tokenDecimals,
      //   tokenDescription,
      //   tokenImageUrl,
      //   tokenWebsite,
      //   tokenTelegram,
      //   tokenTwitter,
      //   { value: ethers.utils.parseEther('0.001') }
      // );
      // const receipt = await tx.wait();
      // const event = receipt.events.find(e => e.event === 'TokenCreated');
      // const tokenAddress = event.args.tokenAddress;
      
      // For demo purposes, simulate a successful transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockTokenAddress = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      
      setCreatedTokenAddress(mockTokenAddress);
      setIsSuccess(true);
      toast.success('Token created successfully!');
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error('Failed to create token. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleViewToken = () => {
    navigate(`/token/${createdTokenAddress}`);
  };
  
  const handleCreateAnother = () => {
    setCurrentStep(1);
    setIsSuccess(false);
    setTokenName('');
    setTokenSymbol('');
    setTokenSupply('');
    setTokenDecimals('18');
    setTokenDescription('');
    setTokenImageUrl('');
    setTokenWebsite('');
    setTokenTelegram('');
    setTokenTwitter('');
    setErrors({});
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <FormCard>
            <FormSection>
              <SectionTitle>🪙 Basic Token Information</SectionTitle>
              <FormGrid>
                <FormGroup>
                  <Label htmlFor="tokenName">Token Name*</Label>
                  <Input
                    id="tokenName"
                    type="text"
                    placeholder="e.g. Awesome Meme Coin"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                  />
                  {errors.tokenName && <HelperText>{errors.tokenName}</HelperText>}
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="tokenSymbol">Token Symbol*</Label>
                  <Input
                    id="tokenSymbol"
                    type="text"
                    placeholder="e.g. AMC"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                  />
                  {errors.tokenSymbol && <HelperText>{errors.tokenSymbol}</HelperText>}
                </FormGroup>
              </FormGrid>
              
              <FormGrid>
                <FormGroup>
                  <Label htmlFor="tokenSupply">Total Supply*</Label>
                  <Input
                    id="tokenSupply"
                    type="text"
                    placeholder="e.g. 1000000"
                    value={tokenSupply}
                    onChange={(e) => setTokenSupply(e.target.value)}
                  />
                  {errors.tokenSupply && <HelperText>{errors.tokenSupply}</HelperText>}
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="tokenDecimals">Decimals</Label>
                  <Select
                    id="tokenDecimals"
                    value={tokenDecimals}
                    onChange={(e) => setTokenDecimals(e.target.value)}
                  >
                    <option value="18">18 (Default)</option>
                    <option value="9">9</option>
                    <option value="6">6</option>
                    <option value="0">0</option>
                  </Select>
                  <HelperText>Standard is 18, like ETH</HelperText>
                </FormGroup>
              </FormGrid>
            </FormSection>
            
            <SubmitButton onClick={handleNextStep}>Continue to Social Info</SubmitButton>
          </FormCard>
        );
        
      case 2:
        return (
          <FormCard>
            <FormSection>
              <SectionTitle>📱 Social Information</SectionTitle>
              
              <FormGroup>
                <Label htmlFor="tokenDescription">Description</Label>
                <TextArea
                  id="tokenDescription"
                  placeholder="Describe your token and its purpose"
                  value={tokenDescription}
                  onChange={(e) => setTokenDescription(e.target.value)}
                />
                {errors.tokenDescription && <HelperText>{errors.tokenDescription}</HelperText>}
                <HelperText>{tokenDescription.length}/500 characters</HelperText>
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="tokenImageUrl">Token Logo URL</Label>
                <Input
                  id="tokenImageUrl"
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={tokenImageUrl}
                  onChange={(e) => setTokenImageUrl(e.target.value)}
                />
                {errors.tokenImageUrl && <HelperText>{errors.tokenImageUrl}</HelperText>}
              </FormGroup>
              
              <FormGrid>
                <FormGroup>
                  <Label htmlFor="tokenWebsite">Website</Label>
                  <Input
                    id="tokenWebsite"
                    type="text"
                    placeholder="https://yourtoken.com"
                    value={tokenWebsite}
                    onChange={(e) => setTokenWebsite(e.target.value)}
                  />
                  {errors.tokenWebsite && <HelperText>{errors.tokenWebsite}</HelperText>}
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="tokenTelegram">Telegram</Label>
                  <Input
                    id="tokenTelegram"
                    type="text"
                    placeholder="https://t.me/yourtoken"
                    value={tokenTelegram}
                    onChange={(e) => setTokenTelegram(e.target.value)}
                  />
                </FormGroup>
              </FormGrid>
              
              <FormGroup>
                <Label htmlFor="tokenTwitter">Twitter</Label>
                <Input
                  id="tokenTwitter"
                  type="text"
                  placeholder="https://twitter.com/yourtoken"
                  value={tokenTwitter}
                  onChange={(e) => setTokenTwitter(e.target.value)}
                />
              </FormGroup>
            </FormSection>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <SecondaryButton onClick={handlePrevStep}>Back</SecondaryButton>
              <PrimaryButton onClick={handleNextStep}>Continue to Review</PrimaryButton>
            </div>
          </FormCard>
        );
        
      case 3:
        return (
          <FormCard>
            <FormSection>
              <SectionTitle>🔍 Review Token Details</SectionTitle>
              
              <PreviewCard>
                <TokenIcon>{tokenSymbol.substring(0, 2)}</TokenIcon>
                <TokenName>{tokenName}</TokenName>
                <TokenSymbol>{tokenSymbol}</TokenSymbol>
                
                <TokenDetail>
                  <TokenDetailLabel>Total Supply</TokenDetailLabel>
                  <TokenDetailValue>{Number(tokenSupply).toLocaleString()} {tokenSymbol}</TokenDetailValue>
                </TokenDetail>
                
                <TokenDetail>
                  <TokenDetailLabel>Decimals</TokenDetailLabel>
                  <TokenDetailValue>{tokenDecimals}</TokenDetailValue>
                </TokenDetail>
                
                <TokenDetail>
                  <TokenDetailLabel>Description</TokenDetailLabel>
                  <TokenDetailValue>{tokenDescription || 'N/A'}</TokenDetailValue>
                </TokenDetail>
                
                {tokenWebsite && (
                  <TokenDetail>
                    <TokenDetailLabel>Website</TokenDetailLabel>
                    <TokenDetailValue>{tokenWebsite}</TokenDetailValue>
                  </TokenDetail>
                )}
                
                {tokenTelegram && (
                  <TokenDetail>
                    <TokenDetailLabel>Telegram</TokenDetailLabel>
                    <TokenDetailValue>{tokenTelegram}</TokenDetailValue>
                  </TokenDetail>
                )}
                
                {tokenTwitter && (
                  <TokenDetail>
                    <TokenDetailLabel>Twitter</TokenDetailLabel>
                    <TokenDetailValue>{tokenTwitter}</TokenDetailValue>
                  </TokenDetail>
                )}
              </PreviewCard>
              
              <FeeCard>
                <FeeRow>
                  <FeeLabel>Token Creation Fee</FeeLabel>
                  <FeeValue>0.001 AB (~$2)</FeeValue>
                </FeeRow>
                <FeeRow>
                  <FeeLabel>Gas Fee (estimated)</FeeLabel>
                  <FeeValue>~0.0001 AB</FeeValue>
                </FeeRow>
                <FeeRow>
                  <FeeLabel>Total</FeeLabel>
                  <FeeValue>~0.0011 AB</FeeValue>
                </FeeRow>
              </FeeCard>
            </FormSection>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <SecondaryButton onClick={handlePrevStep}>Back</SecondaryButton>
              <SubmitButton 
                onClick={handleCreateToken} 
                disabled={isSubmitting || !isConnected || chainId !== 9000}
              >
                {isSubmitting ? '🔄 Creating Token...' : '🚀 Create Token'}
              </SubmitButton>
            </div>
          </FormCard>
        );
        
      default:
        return null;
    }
  };
  
  if (isSuccess) {
    return (
      <PageContainer>
        <SuccessCard>
          <SuccessIcon>✓</SuccessIcon>
          <SuccessTitle>Token Created Successfully!</SuccessTitle>
          <SuccessDescription>
            Your token {tokenName} ({tokenSymbol}) has been created on AB Chain.
            You can now view your token details, add liquidity, or create another token.
          </SuccessDescription>
          
          <TokenDetail>
            <TokenDetailLabel>Token Address</TokenDetailLabel>
            <TokenDetailValue>{createdTokenAddress}</TokenDetailValue>
          </TokenDetail>
          
          <ActionButtons>
            <PrimaryButton onClick={handleViewToken}>View Token</PrimaryButton>
            <SecondaryButton onClick={handleCreateAnother}>Create Another Token</SecondaryButton>
          </ActionButtons>
        </SuccessCard>
      </PageContainer>
    );
  }
  
  return (
    <PageContainer>
      <PageTitle>Create Your Meme Coin</PageTitle>
      <PageDescription>
        Launch your own meme coin on AB Chain in minutes. No coding required.
        Just fill in the details, pay a small fee, and your token will be live instantly.
      </PageDescription>
      
      <ProgressSteps>
        <Step active={currentStep === 1} completed={currentStep > 1}>
          <StepCircle active={currentStep === 1} completed={currentStep > 1}>
            {currentStep > 1 ? '✓' : '1'}
          </StepCircle>
          <StepLabel active={currentStep === 1}>Basic Info</StepLabel>
        </Step>
        
        <Step active={currentStep === 2} completed={currentStep > 2}>
          <StepCircle active={currentStep === 2} completed={currentStep > 2}>
            {currentStep > 2 ? '✓' : '2'}
          </StepCircle>
          <StepLabel active={currentStep === 2}>Social Info</StepLabel>
        </Step>
        
        <Step active={currentStep === 3} completed={false}>
          <StepCircle active={currentStep === 3} completed={false}>
            3
          </StepCircle>
          <StepLabel active={currentStep === 3}>Review & Create</StepLabel>
        </Step>
      </ProgressSteps>
      
      {renderStepContent()}
    </PageContainer>
  );
};

export default CreateToken;