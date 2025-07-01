import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getAllTokens,
  getTokenByAddress,
  createToken,
  verifyToken,
  getTrendingTokens,
  getTokenStats
} from '../controllers/tokenController';
import { auth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';
import { validateRequest } from '../middleware/validateRequest';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tokens
 *   description: Token management endpoints
 */

// Get all tokens with pagination, search, and filtering
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search term must be less than 100 characters'),
    query('sortBy')
      .optional()
      .isIn(['newest', 'oldest', 'marketCap', 'volume', 'holders', 'priceChange'])
      .withMessage('Invalid sort criteria'),
    query('filter')
      .optional()
      .isIn(['all', 'verified', 'trending', 'new'])
      .withMessage('Invalid filter criteria')
  ],
  validateRequest,
  getAllTokens
);

// Get trending tokens
router.get(
  '/trending',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  validateRequest,
  getTrendingTokens
);

// Get token statistics
router.get('/stats', getTokenStats);

// Get token by address
router.get(
  '/:address',
  [
    param('address')
      .isEthereumAddress()
      .withMessage('Invalid Ethereum address')
  ],
  validateRequest,
  getTokenByAddress
);

// Create new token
router.post(
  '/',
  [
    body('name')
      .notEmpty()
      .withMessage('Token name is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Token name must be between 1 and 50 characters')
      .trim()
      .escape(),
    body('symbol')
      .notEmpty()
      .withMessage('Token symbol is required')
      .isLength({ min: 1, max: 10 })
      .withMessage('Token symbol must be between 1 and 10 characters')
      .matches(/^[A-Z0-9]+$/)
      .withMessage('Token symbol must contain only uppercase letters and numbers')
      .trim(),
    body('totalSupply')
      .notEmpty()
      .withMessage('Total supply is required')
      .isNumeric()
      .withMessage('Total supply must be a number')
      .custom((value) => {
        const num = parseFloat(value);
        if (num <= 0) {
          throw new Error('Total supply must be greater than 0');
        }
        if (num > 1e15) {
          throw new Error('Total supply must be less than 1 quadrillion');
        }
        return true;
      }),
    body('decimals')
      .notEmpty()
      .withMessage('Decimals is required')
      .isInt({ min: 0, max: 18 })
      .withMessage('Decimals must be between 0 and 18'),
    body('creator')
      .notEmpty()
      .withMessage('Creator address is required')
      .isEthereumAddress()
      .withMessage('Invalid creator address'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters')
      .trim()
      .escape(),
    body('imageUrl')
      .optional()
      .isURL()
      .withMessage('Invalid image URL')
      .isLength({ max: 500 })
      .withMessage('Image URL must be less than 500 characters'),
    body('website')
      .optional()
      .isURL()
      .withMessage('Invalid website URL')
      .isLength({ max: 200 })
      .withMessage('Website URL must be less than 200 characters'),
    body('telegram')
      .optional()
      .isURL()
      .withMessage('Invalid Telegram URL')
      .isLength({ max: 200 })
      .withMessage('Telegram URL must be less than 200 characters'),
    body('twitter')
      .optional()
      .isURL()
      .withMessage('Invalid Twitter URL')
      .isLength({ max: 200 })
      .withMessage('Twitter URL must be less than 200 characters'),
    body('transactionHash')
      .notEmpty()
      .withMessage('Transaction hash is required')
      .matches(/^0x[a-fA-F0-9]{64}$/)
      .withMessage('Invalid transaction hash format')
  ],
  validateRequest,
  createToken
);

// Verify token (admin only)
router.post(
  '/:address/verify',
  [
    param('address')
      .isEthereumAddress()
      .withMessage('Invalid Ethereum address')
  ],
  validateRequest,
  auth,
  adminAuth,
  verifyToken
);

// Update token metadata (creator only)
router.put(
  '/:address',
  [
    param('address')
      .isEthereumAddress()
      .withMessage('Invalid Ethereum address'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters')
      .trim()
      .escape(),
    body('imageUrl')
      .optional()
      .isURL()
      .withMessage('Invalid image URL')
      .isLength({ max: 500 })
      .withMessage('Image URL must be less than 500 characters'),
    body('website')
      .optional()
      .isURL()
      .withMessage('Invalid website URL')
      .isLength({ max: 200 })
      .withMessage('Website URL must be less than 200 characters'),
    body('telegram')
      .optional()
      .isURL()
      .withMessage('Invalid Telegram URL')
      .isLength({ max: 200 })
      .withMessage('Telegram URL must be less than 200 characters'),
    body('twitter')
      .optional()
      .isURL()
      .withMessage('Invalid Twitter URL')
      .isLength({ max: 200 })
      .withMessage('Twitter URL must be less than 200 characters')
  ],
  validateRequest,
  auth,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const { description, imageUrl, website, telegram, twitter } = req.body;
      const userAddress = req.user?.address;

      // Check if user is the creator of the token
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const token = await prisma.token.findUnique({
        where: { address: address.toLowerCase() }
      });

      if (!token) {
        return res.status(404).json({
          success: false,
          error: 'Token not found'
        });
      }

      if (token.creator.toLowerCase() !== userAddress?.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: 'Only token creator can update metadata'
        });
      }

      const updatedToken = await prisma.token.update({
        where: { address: address.toLowerCase() },
        data: {
          description,
          imageUrl,
          website,
          telegram,
          twitter,
          updatedAt: new Date()
        }
      });

      // Clear cache
      const { redisClient } = await import('../services/redis');
      await redisClient.del(`token:${address.toLowerCase()}`);
      const cachePattern = 'tokens:*';
      const keys = await redisClient.keys(cachePattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }

      // Emit real-time update
      const { io } = await import('../index');
      io.emit('tokenUpdated', updatedToken);

      res.json({
        success: true,
        data: updatedToken
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get token holders
router.get(
  '/:address/holders',
  [
    param('address')
      .isEthereumAddress()
      .withMessage('Invalid Ethereum address'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // This would typically fetch from blockchain or indexed data
      // For now, return mock data
      const mockHolders = [
        {
          address: '0x1234567890123456789012345678901234567890',
          balance: '1000000000000000000000',
          percentage: 10.5,
          rank: 1
        },
        {
          address: '0x2345678901234567890123456789012345678901',
          balance: '500000000000000000000',
          percentage: 5.25,
          rank: 2
        }
      ];

      res.json({
        success: true,
        data: {
          holders: mockHolders.slice(skip, skip + limitNum),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: mockHolders.length,
            pages: Math.ceil(mockHolders.length / limitNum)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get token price history
router.get(
  '/:address/price-history',
  [
    param('address')
      .isEthereumAddress()
      .withMessage('Invalid Ethereum address'),
    query('period')
      .optional()
      .isIn(['1h', '24h', '7d', '30d', '90d', '1y'])
      .withMessage('Invalid time period')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const { period = '24h' } = req.query;

      // This would typically fetch from a price tracking service
      // For now, return mock data
      const mockPriceHistory = [
        { timestamp: Date.now() - 3600000, price: '0.0025', volume: '1000' },
        { timestamp: Date.now() - 7200000, price: '0.0024', volume: '1500' },
        { timestamp: Date.now() - 10800000, price: '0.0026', volume: '800' }
      ];

      res.json({
        success: true,
        data: {
          period,
          priceHistory: mockPriceHistory
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;