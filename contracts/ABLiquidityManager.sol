// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title ABLiquidityManager
 * @dev Manages liquidity pools for tokens created on AB.LAND
 * Integrates with AB Chain DEXs like ABSwap
 */
contract ABLiquidityManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    
    // AB Chain native token (equivalent to ETH on Ethereum)
    address public constant NATIVE_TOKEN = address(0);
    
    // Trading fee: 0.5% (50 basis points)
    uint256 public constant TRADING_FEE_BPS = 50;
    uint256 public constant MAX_BPS = 10000;
    
    struct LiquidityPool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
        uint256 createdAt;
        bool isActive;
    }
    
    struct UserLiquidity {
        uint256 liquidity;
        uint256 lastAddedAt;
    }
    
    // Pool ID => Pool Info
    mapping(bytes32 => LiquidityPool) public pools;
    
    // Pool ID => User => Liquidity Info
    mapping(bytes32 => mapping(address => UserLiquidity)) public userLiquidity;
    
    // Token => Pool IDs
    mapping(address => bytes32[]) public tokenPools;
    
    // Collected fees: Pool ID => Token => Amount
    mapping(bytes32 => mapping(address => uint256)) public collectedFees;
    
    event PoolCreated(
        bytes32 indexed poolId,
        address indexed tokenA,
        address indexed tokenB,
        uint256 reserveA,
        uint256 reserveB
    );
    
    event LiquidityAdded(
        bytes32 indexed poolId,
        address indexed user,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    
    event LiquidityRemoved(
        bytes32 indexed poolId,
        address indexed user,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    
    event TokensSwapped(
        bytes32 indexed poolId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    /**
     * @dev Generate pool ID from token addresses
     */
    function getPoolId(address tokenA, address tokenB) public pure returns (bytes32) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return keccak256(abi.encodePacked(token0, token1));
    }
    
    /**
     * @dev Create a new liquidity pool
     */
    function createPool(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external payable nonReentrant {
        require(tokenA != tokenB, "Identical tokens");
        require(amountA > 0 && amountB > 0, "Invalid amounts");
        
        bytes32 poolId = getPoolId(tokenA, tokenB);
        require(!pools[poolId].isActive, "Pool already exists");
        
        // Handle native token deposits
        if (tokenA == NATIVE_TOKEN) {
            require(msg.value == amountA, "Incorrect native token amount");
        } else if (tokenB == NATIVE_TOKEN) {
            require(msg.value == amountB, "Incorrect native token amount");
        } else {
            require(msg.value == 0, "No native token required");
        }
        
        // Transfer tokens
        if (tokenA != NATIVE_TOKEN) {
            IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        }
        if (tokenB != NATIVE_TOKEN) {
            IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);
        }
        
        // Calculate initial liquidity (geometric mean)
        uint256 liquidity = sqrt(amountA.mul(amountB));
        require(liquidity > 0, "Insufficient liquidity");
        
        // Create pool
        pools[poolId] = LiquidityPool({
            tokenA: tokenA,
            tokenB: tokenB,
            reserveA: amountA,
            reserveB: amountB,
            totalLiquidity: liquidity,
            createdAt: block.timestamp,
            isActive: true
        });
        
        // Record user liquidity
        userLiquidity[poolId][msg.sender] = UserLiquidity({
            liquidity: liquidity,
            lastAddedAt: block.timestamp
        });
        
        // Update token pools mapping
        tokenPools[tokenA].push(poolId);
        tokenPools[tokenB].push(poolId);
        
        emit PoolCreated(poolId, tokenA, tokenB, amountA, amountB);
        emit LiquidityAdded(poolId, msg.sender, amountA, amountB, liquidity);
    }
    
    /**
     * @dev Add liquidity to existing pool
     */
    function addLiquidity(
        bytes32 poolId,
        uint256 amountA,
        uint256 amountB
    ) external payable nonReentrant {
        LiquidityPool storage pool = pools[poolId];
        require(pool.isActive, "Pool does not exist");
        require(amountA > 0 && amountB > 0, "Invalid amounts");
        
        // Calculate optimal amounts based on current ratio
        uint256 optimalAmountB = amountA.mul(pool.reserveB).div(pool.reserveA);
        uint256 optimalAmountA = amountB.mul(pool.reserveA).div(pool.reserveB);
        
        uint256 finalAmountA, finalAmountB;
        
        if (optimalAmountB <= amountB) {
            finalAmountA = amountA;
            finalAmountB = optimalAmountB;
        } else {
            finalAmountA = optimalAmountA;
            finalAmountB = amountB;
        }
        
        // Handle native token deposits
        if (pool.tokenA == NATIVE_TOKEN) {
            require(msg.value >= finalAmountA, "Insufficient native token");
        } else if (pool.tokenB == NATIVE_TOKEN) {
            require(msg.value >= finalAmountB, "Insufficient native token");
        }
        
        // Transfer tokens
        if (pool.tokenA != NATIVE_TOKEN) {
            IERC20(pool.tokenA).safeTransferFrom(msg.sender, address(this), finalAmountA);
        }
        if (pool.tokenB != NATIVE_TOKEN) {
            IERC20(pool.tokenB).safeTransferFrom(msg.sender, address(this), finalAmountB);
        }
        
        // Calculate liquidity to mint
        uint256 liquidity = finalAmountA.mul(pool.totalLiquidity).div(pool.reserveA);
        
        // Update pool reserves
        pool.reserveA = pool.reserveA.add(finalAmountA);
        pool.reserveB = pool.reserveB.add(finalAmountB);
        pool.totalLiquidity = pool.totalLiquidity.add(liquidity);
        
        // Update user liquidity
        userLiquidity[poolId][msg.sender].liquidity = userLiquidity[poolId][msg.sender].liquidity.add(liquidity);
        userLiquidity[poolId][msg.sender].lastAddedAt = block.timestamp;
        
        emit LiquidityAdded(poolId, msg.sender, finalAmountA, finalAmountB, liquidity);
        
        // Refund excess native tokens
        if (pool.tokenA == NATIVE_TOKEN && msg.value > finalAmountA) {
            payable(msg.sender).transfer(msg.value - finalAmountA);
        } else if (pool.tokenB == NATIVE_TOKEN && msg.value > finalAmountB) {
            payable(msg.sender).transfer(msg.value - finalAmountB);
        }
    }
    
    /**
     * @dev Remove liquidity from pool
     */
    function removeLiquidity(
        bytes32 poolId,
        uint256 liquidity
    ) external nonReentrant {
        LiquidityPool storage pool = pools[poolId];
        require(pool.isActive, "Pool does not exist");
        require(liquidity > 0, "Invalid liquidity amount");
        require(userLiquidity[poolId][msg.sender].liquidity >= liquidity, "Insufficient liquidity");
        
        // Calculate amounts to return
        uint256 amountA = liquidity.mul(pool.reserveA).div(pool.totalLiquidity);
        uint256 amountB = liquidity.mul(pool.reserveB).div(pool.totalLiquidity);
        
        // Update pool reserves
        pool.reserveA = pool.reserveA.sub(amountA);
        pool.reserveB = pool.reserveB.sub(amountB);
        pool.totalLiquidity = pool.totalLiquidity.sub(liquidity);
        
        // Update user liquidity
        userLiquidity[poolId][msg.sender].liquidity = userLiquidity[poolId][msg.sender].liquidity.sub(liquidity);
        
        // Transfer tokens back to user
        if (pool.tokenA == NATIVE_TOKEN) {
            payable(msg.sender).transfer(amountA);
        } else {
            IERC20(pool.tokenA).safeTransfer(msg.sender, amountA);
        }
        
        if (pool.tokenB == NATIVE_TOKEN) {
            payable(msg.sender).transfer(amountB);
        } else {
            IERC20(pool.tokenB).safeTransfer(msg.sender, amountB);
        }
        
        emit LiquidityRemoved(poolId, msg.sender, amountA, amountB, liquidity);
    }
    
    /**
     * @dev Swap tokens in a pool
     */
    function swapTokens(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut
    ) external payable nonReentrant {
        LiquidityPool storage pool = pools[poolId];
        require(pool.isActive, "Pool does not exist");
        require(tokenIn == pool.tokenA || tokenIn == pool.tokenB, "Invalid token");
        require(amountIn > 0, "Invalid amount");
        
        address tokenOut = tokenIn == pool.tokenA ? pool.tokenB : pool.tokenA;
        uint256 reserveIn = tokenIn == pool.tokenA ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = tokenIn == pool.tokenA ? pool.reserveB : pool.reserveA;
        
        // Calculate output amount with fee
        uint256 amountInWithFee = amountIn.mul(MAX_BPS.sub(TRADING_FEE_BPS)).div(MAX_BPS);
        uint256 amountOut = getAmountOut(amountInWithFee, reserveIn, reserveOut);
        require(amountOut >= minAmountOut, "Insufficient output amount");
        
        // Handle native token input
        if (tokenIn == NATIVE_TOKEN) {
            require(msg.value == amountIn, "Incorrect native token amount");
        } else {
            require(msg.value == 0, "No native token required");
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        }
        
        // Update reserves
        if (tokenIn == pool.tokenA) {
            pool.reserveA = pool.reserveA.add(amountIn);
            pool.reserveB = pool.reserveB.sub(amountOut);
        } else {
            pool.reserveB = pool.reserveB.add(amountIn);
            pool.reserveA = pool.reserveA.sub(amountOut);
        }
        
        // Transfer output tokens
        if (tokenOut == NATIVE_TOKEN) {
            payable(msg.sender).transfer(amountOut);
        } else {
            IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        }
        
        // Record fees
        uint256 feeAmount = amountIn.mul(TRADING_FEE_BPS).div(MAX_BPS);
        collectedFees[poolId][tokenIn] = collectedFees[poolId][tokenIn].add(feeAmount);
        
        emit TokensSwapped(poolId, msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
    
    /**
     * @dev Calculate output amount for swap (constant product formula)
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        require(amountIn > 0, "Invalid input amount");
        require(reserveIn > 0 && reserveOut > 0, "Invalid reserves");
        
        uint256 numerator = amountIn.mul(reserveOut);
        uint256 denominator = reserveIn.add(amountIn);
        return numerator.div(denominator);
    }
    
    /**
     * @dev Get pool information
     */
    function getPool(bytes32 poolId) external view returns (LiquidityPool memory) {
        return pools[poolId];
    }
    
    /**
     * @dev Get user liquidity in a pool
     */
    function getUserLiquidity(bytes32 poolId, address user) external view returns (UserLiquidity memory) {
        return userLiquidity[poolId][user];
    }
    
    /**
     * @dev Get pools for a token
     */
    function getTokenPools(address token) external view returns (bytes32[] memory) {
        return tokenPools[token];
    }
    
    /**
     * @dev Withdraw collected fees (only owner)
     */
    function withdrawFees(bytes32 poolId, address token) external onlyOwner {
        uint256 amount = collectedFees[poolId][token];
        require(amount > 0, "No fees to withdraw");
        
        collectedFees[poolId][token] = 0;
        
        if (token == NATIVE_TOKEN) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }
    
    /**
     * @dev Square root function for liquidity calculation
     */
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
    
    /**
     * @dev Emergency function to pause a pool (only owner)
     */
    function pausePool(bytes32 poolId) external onlyOwner {
        require(pools[poolId].isActive, "Pool already paused");
        pools[poolId].isActive = false;
    }
    
    /**
     * @dev Emergency function to unpause a pool (only owner)
     */
    function unpausePool(bytes32 poolId) external onlyOwner {
        require(!pools[poolId].isActive, "Pool already active");
        pools[poolId].isActive = true;
    }
    
    /**
     * @dev Receive native tokens
     */
    receive() external payable {}
}