import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { blockchainService } from '../services/blockchain';
import { redisClient } from '../services/redis';
import { io } from '../index';

const prisma = new PrismaClient();

/**
 * @swagger
 * components:
 *   schemas:
 *     Token:
 *       type: object
 *       required:
 *         - address
 *         - name
 *         - symbol
 *         - totalSupply
 *         - decimals
 *         - creator
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the token
 *         address:
 *           type: string
 *           description: Token contract address
 *         name:
 *           type: string
 *           description: Token name
 *         symbol:
 *           type: string
 *           description: Token symbol
 *         totalSupply:
 *           type: string
 *           description: Total supply of tokens
 *         decimals:
 *           type: integer
 *           description: Number of decimal places
 *         creator:
 *           type: string
 *           description: Address of token creator
 *         description:
 *           type: string
 *           description: Token description
 *         imageUrl:
 *           type: string
 *           description: Token logo URL
 *         website:
 *           type: string
 *           description: Token website URL
 *         telegram:
 *           type: string
 *           description: Telegram group URL
 *         twitter:
 *           type: string
 *           description: Twitter profile URL
 *         verified:
 *           type: boolean
 *           description: Whether token is verified
 *         trending:
 *           type: boolean
 *           description: Whether token is trending
 *         marketCap:
 *           type: string
 *           description: Current market capitalization
 *         price:
 *           type: string
 *           description: Current token price
 *         volume24h:
 *           type: string
 *           description: 24-hour trading volume
 *         priceChange24h:
 *           type: number
 *           description: 24-hour price change percentage
 *         holders:
 *           type: integer
 *           description: Number of token holders
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Token creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * /api/tokens:
 *   get:
 *     summary: Get all tokens
 *     tags: [Tokens]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of tokens per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, symbol, or address
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, marketCap, volume, holders, priceChange]
 *           default: newest
 *         description: Sort criteria
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, verified, trending, new]
 *           default: all
 *         description: Filter criteria
 *     responses:
 *       200:
 *         description: List of tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokens:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Token'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
export const getAllTokens = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'newest',
      filter = 'all'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { symbol: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (filter === 'verified') {
      where.verified = true;
    } else if (filter === 'trending') {
      where.trending = true;
    } else if (filter === 'new') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      where.createdAt = { gte: oneDayAgo };
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'marketCap':
        orderBy = { marketCap: 'desc' };
        break;
      case 'volume':
        orderBy = { volume24h: 'desc' };
        break;
      case 'holders':
        orderBy = { holders: 'desc' };
        break;
      case 'priceChange':
        orderBy = { priceChange24h: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Check cache first
    const cacheKey = `tokens:${JSON.stringify({ page: pageNum, limit: limitNum, search, sortBy, filter })}`;
    const cachedResult = await redisClient.get(cacheKey);
    
    if (cachedResult) {
      return res.json({
        success: true,
        data: JSON.parse(cachedResult),
        cached: true
      });
    }

    // Fetch from database
    const [tokens, total] = await Promise.all([
      prisma.token.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          _count: {
            select: { transactions: true }
          }
        }
      }),
      prisma.token.count({ where })
    ]);

    const result = {
      tokens,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };

    // Cache result for 5 minutes
    await redisClient.setex(cacheKey, 300, JSON.stringify(result));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error fetching tokens:', error);
    next(error);
  }
};

/**
 * @swagger
 * /api/tokens/{address}:
 *   get:
 *     summary: Get token by address
 *     tags: [Tokens]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Token contract address
 *     responses:
 *       200:
 *         description: Token details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Token'
 *       404:
 *         description: Token not found
 */
export const getTokenByAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;

    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token address'
      });
    }

    // Check cache first
    const cacheKey = `token:${address.toLowerCase()}`;
    const cachedToken = await redisClient.get(cacheKey);
    
    if (cachedToken) {
      return res.json({
        success: true,
        data: JSON.parse(cachedToken),
        cached: true
      });
    }

    const token = await prisma.token.findUnique({
      where: { address: address.toLowerCase() },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: { address: true, username: true }
            }
          }
        },
        _count: {
          select: { transactions: true }
        }
      }
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'Token not found'
      });
    }

    // Update token data from blockchain if needed
    try {
      const blockchainData = await blockchainService.getTokenData(address);
      if (blockchainData) {
        // Update token with fresh blockchain data
        const updatedToken = await prisma.token.update({
          where: { address: address.toLowerCase() },
          data: {
            price: blockchainData.price,
            marketCap: blockchainData.marketCap,
            volume24h: blockchainData.volume24h,
            priceChange24h: blockchainData.priceChange24h,
            holders: blockchainData.holders,
            updatedAt: new Date()
          },
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              include: {
                user: {
                  select: { address: true, username: true }
                }
              }
            },
            _count: {
              select: { transactions: true }
            }
          }
        });

        // Cache updated token for 2 minutes
        await redisClient.setex(cacheKey, 120, JSON.stringify(updatedToken));

        return res.json({
          success: true,
          data: updatedToken
        });
      }
    } catch (blockchainError) {
      logger.warn('Failed to fetch blockchain data for token:', address, blockchainError);
    }

    // Cache token for 2 minutes
    await redisClient.setex(cacheKey, 120, JSON.stringify(token));

    res.json({
      success: true,
      data: token
    });
  } catch (error) {
    logger.error('Error fetching token:', error);
    next(error);
  }
};

/**
 * @swagger
 * /api/tokens:
 *   post:
 *     summary: Create a new token
 *     tags: [Tokens]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - symbol
 *               - totalSupply
 *               - decimals
 *               - creator
 *               - transactionHash
 *             properties:
 *               name:
 *                 type: string
 *                 description: Token name
 *               symbol:
 *                 type: string
 *                 description: Token symbol
 *               totalSupply:
 *                 type: string
 *                 description: Total supply of tokens
 *               decimals:
 *                 type: integer
 *                 description: Number of decimal places
 *               creator:
 *                 type: string
 *                 description: Address of token creator
 *               description:
 *                 type: string
 *                 description: Token description
 *               imageUrl:
 *                 type: string
 *                 description: Token logo URL
 *               website:
 *                 type: string
 *                 description: Token website URL
 *               telegram:
 *                 type: string
 *                 description: Telegram group URL
 *               twitter:
 *                 type: string
 *                 description: Twitter profile URL
 *               transactionHash:
 *                 type: string
 *                 description: Creation transaction hash
 *     responses:
 *       201:
 *         description: Token created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Token'
 *       400:
 *         description: Validation error
 */
export const createToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      name,
      symbol,
      totalSupply,
      decimals,
      creator,
      description,
      imageUrl,
      website,
      telegram,
      twitter,
      transactionHash
    } = req.body;

    // Verify transaction and get token address
    const tokenAddress = await blockchainService.getTokenAddressFromTransaction(transactionHash);
    
    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash or token creation failed'
      });
    }

    // Check if token already exists
    const existingToken = await prisma.token.findUnique({
      where: { address: tokenAddress.toLowerCase() }
    });

    if (existingToken) {
      return res.status(409).json({
        success: false,
        error: 'Token already exists'
      });
    }

    // Create token in database
    const token = await prisma.token.create({
      data: {
        address: tokenAddress.toLowerCase(),
        name,
        symbol: symbol.toUpperCase(),
        totalSupply,
        decimals,
        creator: creator.toLowerCase(),
        description,
        imageUrl,
        website,
        telegram,
        twitter,
        transactionHash,
        price: '0',
        marketCap: '0',
        volume24h: '0',
        priceChange24h: 0,
        holders: 1, // Creator is the first holder
        verified: false,
        trending: false
      }
    });

    // Clear tokens cache
    const cachePattern = 'tokens:*';
    const keys = await redisClient.keys(cachePattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }

    // Emit real-time update
    io.emit('tokenCreated', token);

    logger.info(`New token created: ${name} (${symbol}) at ${tokenAddress}`);

    res.status(201).json({
      success: true,
      data: token
    });
  } catch (error) {
    logger.error('Error creating token:', error);
    next(error);
  }
};

/**
 * @swagger
 * /api/tokens/{address}/verify:
 *   post:
 *     summary: Verify a token (admin only)
 *     tags: [Tokens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Token contract address
 *     responses:
 *       200:
 *         description: Token verified successfully
 *       404:
 *         description: Token not found
 *       403:
 *         description: Unauthorized
 */
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;

    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token address'
      });
    }

    const token = await prisma.token.update({
      where: { address: address.toLowerCase() },
      data: { verified: true, updatedAt: new Date() }
    });

    // Clear cache
    await redisClient.del(`token:${address.toLowerCase()}`);
    const cachePattern = 'tokens:*';
    const keys = await redisClient.keys(cachePattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }

    // Emit real-time update
    io.emit('tokenVerified', { address: address.toLowerCase() });

    logger.info(`Token verified: ${address}`);

    res.json({
      success: true,
      data: token
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Token not found'
      });
    }
    logger.error('Error verifying token:', error);
    next(error);
  }
};

/**
 * @swagger
 * /api/tokens/trending:
 *   get:
 *     summary: Get trending tokens
 *     tags: [Tokens]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of trending tokens to return
 *     responses:
 *       200:
 *         description: List of trending tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Token'
 */
export const getTrendingTokens = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

    // Check cache first
    const cacheKey = `trending:tokens:${limitNum}`;
    const cachedResult = await redisClient.get(cacheKey);
    
    if (cachedResult) {
      return res.json({
        success: true,
        data: JSON.parse(cachedResult),
        cached: true
      });
    }

    // Calculate trending based on volume and price change
    const tokens = await prisma.token.findMany({
      where: {
        volume24h: { gt: '0' }
      },
      orderBy: [
        { volume24h: 'desc' },
        { priceChange24h: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limitNum
    });

    // Cache result for 10 minutes
    await redisClient.setex(cacheKey, 600, JSON.stringify(tokens));

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    logger.error('Error fetching trending tokens:', error);
    next(error);
  }
};

/**
 * @swagger
 * /api/tokens/stats:
 *   get:
 *     summary: Get token statistics
 *     tags: [Tokens]
 *     responses:
 *       200:
 *         description: Token statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalTokens:
 *                       type: integer
 *                     totalMarketCap:
 *                       type: string
 *                     totalVolume24h:
 *                       type: string
 *                     totalHolders:
 *                       type: integer
 *                     verifiedTokens:
 *                       type: integer
 *                     newTokens24h:
 *                       type: integer
 */
export const getTokenStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check cache first
    const cacheKey = 'token:stats';
    const cachedResult = await redisClient.get(cacheKey);
    
    if (cachedResult) {
      return res.json({
        success: true,
        data: JSON.parse(cachedResult),
        cached: true
      });
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalTokens, verifiedTokens, newTokens24h, aggregates] = await Promise.all([
      prisma.token.count(),
      prisma.token.count({ where: { verified: true } }),
      prisma.token.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.token.aggregate({
        _sum: {
          holders: true
        }
      })
    ]);

    // Calculate total market cap and volume (this would be more complex in reality)
    const tokens = await prisma.token.findMany({
      select: {
        marketCap: true,
        volume24h: true
      }
    });

    const totalMarketCap = tokens.reduce((sum, token) => {
      return sum + parseFloat(token.marketCap || '0');
    }, 0);

    const totalVolume24h = tokens.reduce((sum, token) => {
      return sum + parseFloat(token.volume24h || '0');
    }, 0);

    const stats = {
      totalTokens,
      totalMarketCap: totalMarketCap.toString(),
      totalVolume24h: totalVolume24h.toString(),
      totalHolders: aggregates._sum.holders || 0,
      verifiedTokens,
      newTokens24h
    };

    // Cache result for 5 minutes
    await redisClient.setex(cacheKey, 300, JSON.stringify(stats));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching token stats:', error);
    next(error);
  }
};