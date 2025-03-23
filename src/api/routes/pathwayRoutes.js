/**
 * Neural Pathway API Routes
 * 
 * Endpoints for managing neural pathways between agents in the AETHERMIND cognitive network.
 */

const express = require('express');
const { NeuralPathway } = require('../../models/neuralPathway');
const { Agent } = require('../../models/agent');
const { cognitiveMesh } = require('../../core/cognitiveMesh');

const router = express.Router();

/**
 * @route   GET /api/pathways
 * @desc    Get all neural pathways with optional filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    
    // Apply query parameters as filters
    if (req.query.sourceAgentId) {
      filter.sourceAgentId = req.query.sourceAgentId;
    }
    
    if (req.query.targetAgentId) {
      filter.targetAgentId = req.query.targetAgentId;
    }
    
    if (req.query.minStrength) {
      filter.minStrength = parseFloat(req.query.minStrength);
    }
    
    if (req.query.bidirectional !== undefined) {
      filter.bidirectional = req.query.bidirectional === 'true';
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    const pathways = await NeuralPathway.findAll(filter);
    
    res.json({
      success: true,
      count: pathways.length,
      data: pathways
    });
  } catch (error) {
    console.error('Error fetching neural pathways:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/pathways/:id
 * @desc    Get a single neural pathway by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const pathway = await NeuralPathway.findById(req.params.id);
    
    if (!pathway) {
      return res.status(404).json({
        success: false,
        error: 'Neural pathway not found'
      });
    }
    
    res.json({
      success: true,
      data: pathway
    });
  } catch (error) {
    console.error('Error fetching neural pathway:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/pathways
 * @desc    Create a new neural pathway
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { sourceAgentId, targetAgentId, ...pathwayData } = req.body;
    
    // Basic validation
    if (!sourceAgentId || !targetAgentId) {
      return res.status(400).json({
        success: false,
        error: 'Source and target agent IDs are required'
      });
    }
    
    // Check that both agents exist
    const sourceAgent = await Agent.findById(sourceAgentId);
    if (!sourceAgent) {
      return res.status(404).json({
        success: false,
        error: `Source agent with ID ${sourceAgentId} not found`
      });
    }
    
    const targetAgent = await Agent.findById(targetAgentId);
    if (!targetAgent) {
      return res.status(404).json({
        success: false,
        error: `Target agent with ID ${targetAgentId} not found`
      });
    }
    
    // Check if a pathway already exists between these agents
    const existingPathway = await NeuralPathway.findByAgents(sourceAgentId, targetAgentId);
    if (existingPathway) {
      return res.status(400).json({
        success: false,
        error: 'A neural pathway already exists between these agents'
      });
    }
    
    // Create the neural pathway via the cognitive mesh
    const pathway = await cognitiveMesh.establishPathway(
      sourceAgentId,
      targetAgentId,
      pathwayData
    );
    
    res.status(201).json({
      success: true,
      data: pathway
    });
  } catch (error) {
    console.error('Error creating neural pathway:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/pathways/:id
 * @desc    Update a neural pathway
 * @access  Public
 */
router.put('/:id', async (req, res) => {
  try {
    const pathway = await NeuralPathway.findById(req.params.id);
    
    if (!pathway) {
      return res.status(404).json({
        success: false,
        error: 'Neural pathway not found'
      });
    }
    
    // Prevent changing the source or target agents
    const { sourceAgentId, targetAgentId, ...updateData } = req.body;
    
    if (sourceAgentId && sourceAgentId !== pathway.sourceAgentId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change the source agent of an existing pathway'
      });
    }
    
    if (targetAgentId && targetAgentId !== pathway.targetAgentId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change the target agent of an existing pathway'
      });
    }
    
    const updatedPathway = await NeuralPathway.update(req.params.id, updateData);
    
    res.json({
      success: true,
      data: updatedPathway
    });
  } catch (error) {
    console.error('Error updating neural pathway:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   DELETE /api/pathways/:id
 * @desc    Delete a neural pathway
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const pathway = await NeuralPathway.findById(req.params.id);
    
    if (!pathway) {
      return res.status(404).json({
        success: false,
        error: 'Neural pathway not found'
      });
    }
    
    const success = await NeuralPathway.delete(req.params.id);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete neural pathway'
      });
    }
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting neural pathway:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/pathways/:id/token
 * @desc    Generate a Neural Pathway Token (NPT) for a pathway
 * @access  Public
 */
router.post('/:id/token', async (req, res) => {
  try {
    const pathway = await NeuralPathway.findById(req.params.id);
    
    if (!pathway) {
      return res.status(404).json({
        success: false,
        error: 'Neural pathway not found'
      });
    }
    
    if (pathway.tokenId) {
      return res.status(400).json({
        success: false,
        error: `This pathway already has a token (${pathway.tokenId})`
      });
    }
    
    if (!process.env.ENABLE_NPT_MINTING || process.env.ENABLE_NPT_MINTING === 'false') {
      return res.status(403).json({
        success: false,
        error: 'NPT minting is currently disabled'
      });
    }
    
    const tokenizedPathway = await NeuralPathway.generateToken(req.params.id);
    
    res.json({
      success: true,
      data: tokenizedPathway
    });
  } catch (error) {
    console.error('Error generating neural pathway token:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/pathways/:id/usage
 * @desc    Record usage of a neural pathway
 * @access  Public
 */
router.post('/:id/usage', async (req, res) => {
  try {
    const pathway = await NeuralPathway.findById(req.params.id);
    
    if (!pathway) {
      return res.status(404).json({
        success: false,
        error: 'Neural pathway not found'
      });
    }
    
    const updatedPathway = await NeuralPathway.recordUsage(req.params.id);
    
    res.json({
      success: true,
      data: updatedPathway
    });
  } catch (error) {
    console.error('Error recording neural pathway usage:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/pathways/:id/strength
 * @desc    Update the strength of a neural pathway
 * @access  Public
 */
router.put('/:id/strength', async (req, res) => {
  try {
    const { strength } = req.body;
    
    if (strength === undefined || isNaN(parseFloat(strength))) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid strength value'
      });
    }
    
    const pathway = await NeuralPathway.findById(req.params.id);
    
    if (!pathway) {
      return res.status(404).json({
        success: false,
        error: 'Neural pathway not found'
      });
    }
    
    const updatedPathway = await NeuralPathway.updateStrength(req.params.id, parseFloat(strength));
    
    res.json({
      success: true,
      data: updatedPathway
    });
  } catch (error) {
    console.error('Error updating neural pathway strength:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router; 