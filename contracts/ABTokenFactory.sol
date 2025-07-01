// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ABToken
 * @dev Standard ERC20 token for meme coins created on AB.LAND
 */
contract ABToken is ERC20, Ownable {
    uint8 private _decimals;
    string private _description;
    string private _imageUrl;
    string private _website;
    string private _telegram;
    string private _twitter;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint8 decimals_,
        address owner,
        string memory description,
        string memory imageUrl,
        string memory website,
        string memory telegram,
        string memory twitter
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        _description = description;
        _imageUrl = imageUrl;
        _website = website;
        _telegram = telegram;
        _twitter = twitter;
        _mint(owner, totalSupply * 10**decimals_);
        _transferOwnership(owner);
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    function getTokenInfo() external view returns (
        string memory description,
        string memory imageUrl,
        string memory website,
        string memory telegram,
        string memory twitter
    ) {
        return (_description, _imageUrl, _website, _telegram, _twitter);
    }
}

/**
 * @title ABTokenFactory
 * @dev Factory contract for creating meme tokens on AB.LAND
 */
contract ABTokenFactory is Ownable, ReentrancyGuard {
    uint256 public constant CREATION_FEE = 0.001 ether; // ~$2 on AB Chain
    uint256 public tokenCount;
    
    struct TokenInfo {
        address tokenAddress;
        address creator;
        string name;
        string symbol;
        uint256 totalSupply;
        uint256 createdAt;
        bool isActive;
    }
    
    mapping(uint256 => TokenInfo) public tokens;
    mapping(address => uint256[]) public creatorTokens;
    mapping(address => bool) public isABToken;
    
    event TokenCreated(
        uint256 indexed tokenId,
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply
    );
    
    event TokenDeactivated(uint256 indexed tokenId, address indexed tokenAddress);
    
    modifier onlyValidTokenData(
        string memory name,
        string memory symbol,
        uint256 totalSupply
    ) {
        require(bytes(name).length > 0 && bytes(name).length <= 50, "Invalid name length");
        require(bytes(symbol).length > 0 && bytes(symbol).length <= 10, "Invalid symbol length");
        require(totalSupply > 0 && totalSupply <= 1e15, "Invalid total supply");
        _;
    }
    
    /**
     * @dev Create a new meme token
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint8 decimals,
        string memory description,
        string memory imageUrl,
        string memory website,
        string memory telegram,
        string memory twitter
    ) external payable nonReentrant onlyValidTokenData(name, symbol, totalSupply) {
        require(msg.value >= CREATION_FEE, "Insufficient creation fee");
        require(decimals <= 18, "Invalid decimals");
        
        // Deploy new token contract
        ABToken newToken = new ABToken(
            name,
            symbol,
            totalSupply,
            decimals,
            msg.sender,
            description,
            imageUrl,
            website,
            telegram,
            twitter
        );
        
        address tokenAddress = address(newToken);
        uint256 tokenId = tokenCount++;
        
        // Store token info
        tokens[tokenId] = TokenInfo({
            tokenAddress: tokenAddress,
            creator: msg.sender,
            name: name,
            symbol: symbol,
            totalSupply: totalSupply,
            createdAt: block.timestamp,
            isActive: true
        });
        
        creatorTokens[msg.sender].push(tokenId);
        isABToken[tokenAddress] = true;
        
        emit TokenCreated(tokenId, tokenAddress, msg.sender, name, symbol, totalSupply);
        
        // Refund excess payment
        if (msg.value > CREATION_FEE) {
            payable(msg.sender).transfer(msg.value - CREATION_FEE);
        }
    }
    
    /**
     * @dev Get token information by ID
     */
    function getToken(uint256 tokenId) external view returns (TokenInfo memory) {
        require(tokenId < tokenCount, "Token does not exist");
        return tokens[tokenId];
    }
    
    /**
     * @dev Get tokens created by a specific address
     */
    function getCreatorTokens(address creator) external view returns (uint256[] memory) {
        return creatorTokens[creator];
    }
    
    /**
     * @dev Get all active tokens (paginated)
     */
    function getActiveTokens(uint256 offset, uint256 limit) external view returns (TokenInfo[] memory) {
        require(limit <= 100, "Limit too high");
        
        uint256 activeCount = 0;
        for (uint256 i = 0; i < tokenCount; i++) {
            if (tokens[i].isActive) activeCount++;
        }
        
        if (offset >= activeCount) {
            return new TokenInfo[](0);
        }
        
        uint256 resultLength = activeCount - offset;
        if (resultLength > limit) {
            resultLength = limit;
        }
        
        TokenInfo[] memory result = new TokenInfo[](resultLength);
        uint256 currentIndex = 0;
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < tokenCount && resultIndex < resultLength; i++) {
            if (tokens[i].isActive) {
                if (currentIndex >= offset) {
                    result[resultIndex] = tokens[i];
                    resultIndex++;
                }
                currentIndex++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Deactivate a token (only owner)
     */
    function deactivateToken(uint256 tokenId) external onlyOwner {
        require(tokenId < tokenCount, "Token does not exist");
        require(tokens[tokenId].isActive, "Token already deactivated");
        
        tokens[tokenId].isActive = false;
        emit TokenDeactivated(tokenId, tokens[tokenId].tokenAddress);
    }
    
    /**
     * @dev Withdraw collected fees (only owner)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Update creation fee (only owner)
     */
    function updateCreationFee(uint256 newFee) external onlyOwner {
        require(newFee <= 0.01 ether, "Fee too high");
        // Note: This would require a new variable and event, keeping simple for now
    }
}