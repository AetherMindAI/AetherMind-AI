/**
 * Token API Routes
 * 
 * Endpoints for managing Neural Pathway Tokens (NPTs) in the AETHERMIND network.
 */

const express = require('express');
const Joi = require('joi');
const { validate } = require('../../utils/validation');
const tokenService = require('../../services/tokenService');
const { NotFoundError, BlockchainError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const NeuralPathway = require('../../models/schemas/neuralPathwaySchema');

const router = express.Router();

// Validation schemas
const schemas = {
  mintToken: {
    body: Joi.object({
      pathwayId: Joi.string().required(),
      ownerAddress: Joi.string().required().regex(/^0x[a-fA-F0-9]{40}$/)
    })
  },
  updateStrength: {
    params: Joi.object({
      tokenId: Joi.number().required()
    }),
    body: Joi.object({
      strength: Joi.number().min(0).max(1).required()
    })
  },
  getToken: {
    params: Joi.object({
      tokenId: Joi.number().required()
    }),
    query: Joi.object({
      chain: Joi.string().valid('ethereum', 'polygon', 'bsc').default('ethereum')
    })
  }
};

/**
 * @swagger
 * /tokens:
 *   post:
 *     summary: Mint a new Neural Pathway Token
 *     description: Create a new NFT representing a neural pathway
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pathwayId
 *               - ownerAddress
 *             properties:
 *               pathwayId:
 *                 type: string
 *                 description: ID of the neural pathway to tokenize
 *               ownerAddress:
 *                 type: string
 *                 description: Ethereum address that will own the token
 *     responses:
 *       201:
 *         description: Token created
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Pathway not found
 *       500:
 *         description: Server error
 */
router.post('/', validate(schemas.mintToken), async (req, res, next) => {
  try {
    // Check if NPT minting is enabled
    if (!tokenService.isNptMintingEnabled()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FEATURE_DISABLED',
          message: 'NPT minting is currently disabled'
        }
      });
    }
    
    const { pathwayId, ownerAddress } = req.body;
    
    // Find the pathway
    const pathway = await NeuralPathway.findById(pathwayId);
    if (!pathway) {
      throw new NotFoundError('Neural Pathway', pathwayId);
    }
    
    // Check if the pathway already has a token
    if (pathway.tokenId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_EXISTS',
          message: 'This pathway already has a token',
          tokenId: pathway.tokenId
        }
      });
    }
    
    logger.info(`Minting NPT for pathway ${pathwayId}`);
    
    // Mint the token
    const result = await tokenService.mintPathwayToken(pathway, ownerAddress);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MINT_FAILED',
          message: result.message || 'Failed to mint token'
        }
      });
    }
    
    // Update the pathway with the token ID
    pathway.tokenId = result.tokenId;
    await pathway.save();
    
    logger.info(`NPT minted successfully, token ID: ${result.tokenId}`);
    
    res.status(201).json({
      success: true,
      data: {
        pathwayId: pathway.id,
        tokenId: result.tokenId,
        chain: result.chain,
        transactionHash: result.transactionHash
      }
    });
  } catch (error) {
    logger.error('Error minting token:', error);
    
    if (error instanceof BlockchainError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'BLOCKCHAIN_ERROR',
          message: error.message
        }
      });
    }
    
    next(error);
  }
});

/**
 * @swagger
 * /tokens/{tokenId}:
 *   get:
 *     summary: Get token details
 *     description: Retrieve details about a Neural Pathway Token
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: number
 *         description: Token ID
 *       - in: query
 *         name: chain
 *         schema:
 *           type: string
 *           enum: [ethereum, polygon, bsc]
 *           default: ethereum
 *         description: Blockchain network
 *     responses:
 *       200:
 *         description: Token details
 *       404:
 *         description: Token not found
 *       500:
 *         description: Server error
 */
router.get('/:tokenId', validate(schemas.getToken), async (req, res, next) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const chain = req.query.chain || 'ethereum';
    
    logger.debug(`Fetching token details for ID: ${tokenId} on ${chain}`);
    
    const tokenDetails = await tokenService.getPathwayTokenDetails(tokenId, chain);
    
    res.json({
      success: true,
      data: tokenDetails
    });
  } catch (error) {
    logger.error(`Error fetching token ${req.params.tokenId}:`, error);
    
    if (error.message && error.message.includes('Token does not exist')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOKEN_NOT_FOUND',
          message: `Token with ID ${req.params.tokenId} not found`
        }
      });
    }
    
    next(error);
  }
});

/**
 * @swagger
 * /tokens/{tokenId}/strength:
 *   put:
 *     summary: Update token strength
 *     description: Update the strength of a Neural Pathway Token
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: number
 *         description: Token ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - strength
 *             properties:
 *               strength:
 *                 type: number
 *                 description: New strength value (0-1)
 *     responses:
 *       200:
 *         description: Strength updated
 *       404:
 *         description: Token or pathway not found
 *       500:
 *         description: Server error
 */
router.put('/:tokenId/strength', validate(schemas.updateStrength), async (req, res, next) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const { strength } = req.body;
    
    // Find the pathway with this token ID
    const pathway = await NeuralPathway.findOne({ tokenId });
    
    if (!pathway) {
      throw new NotFoundError('Pathway with token ID', tokenId);
    }
    
    // Update the pathway strength in the database
    pathway.strength = strength;
    await pathway.save();
    
    logger.info(`Updating token ${tokenId} strength to ${strength}`);
    
    // Update the token strength on the blockchain
    const result = await tokenService.updatePathwayTokenStrength(pathway);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: result.message || 'Failed to update token strength'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        pathwayId: pathway.id,
        tokenId: pathway.tokenId,
        strength: pathway.strength,
        chain: result.chain,
        transactionHash: result.transactionHash
      }
    });
  } catch (error) {
    logger.error(`Error updating token ${req.params.tokenId}:`, error);
    
    if (error instanceof BlockchainError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'BLOCKCHAIN_ERROR',
          message: error.message
        }
      });
    }
    
    next(error);
  }
});

module.exports = router; 