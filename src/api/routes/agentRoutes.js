/**
 * Agent API Routes
 * 
 * Endpoints for managing AI agents in the AETHERMIND cognitive network.
 */

const express = require('express');
const { Agent } = require('../../models/agent');
const { cognitiveMesh } = require('../../core/cognitiveMesh');
const { validate, schemas } = require('../../utils/validation');
const { NotFoundError, ConflictError } = require('../../utils/errors');
const logger = require('../../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /agents:
 *   get:
 *     summary: Get all agents
 *     description: Retrieve a list of all agents with optional filtering
 *     parameters:
 *       - in: query
 *         name: capabilities
 *         schema:
 *           type: string
 *         description: Comma-separated list of required capabilities
 *       - in: query
 *         name: minTrustScore
 *         schema:
 *           type: number
 *         description: Minimum trust score
 *       - in: query
 *         name: chain
 *         schema:
 *           type: string
 *           enum: [ethereum, bnb, solana]
 *         description: Blockchain network
 *       - in: query
 *         name: owner
 *         schema:
 *           type: string
 *         description: Agent owner
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, learning]
 *         description: Agent status
 *     responses:
 *       200:
 *         description: A list of agents
 *       500:
 *         description: Server error
 */
router.get('/', validate(schemas.agent.getAll), async (req, res, next) => {
  try {
    const filter = {};
    
    // Apply query parameters as filters
    if (req.query.capabilities) {
      filter.capabilities = req.query.capabilities.split(',');
    }
    
    if (req.query.minTrustScore) {
      filter.minTrustScore = parseFloat(req.query.minTrustScore);
    }
    
    if (req.query.chain) {
      filter.chain = req.query.chain;
    }
    
    if (req.query.owner) {
      filter.owner = req.query.owner;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    logger.debug('Fetching agents with filter', { filter });
    const agents = await Agent.findAll(filter);
    
    res.json({
      success: true,
      count: agents.length,
      data: agents
    });
  } catch (error) {
    logger.error('Error fetching agents:', error);
    next(error);
  }
});

/**
 * @swagger
 * /agents/{id}:
 *   get:
 *     summary: Get a single agent
 *     description: Retrieve an agent by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent details
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.get('/:id', validate(schemas.agent.getOne), async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      throw new NotFoundError('Agent', req.params.id);
    }
    
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    logger.error('Error fetching agent:', error);
    next(error);
  }
});

/**
 * @swagger
 * /agents:
 *   post:
 *     summary: Create a new agent
 *     description: Create a new AI agent in the network
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               capabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *               trustScore:
 *                 type: number
 *               chain:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Created agent
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/', validate(schemas.agent.create), async (req, res, next) => {
  try {
    const agentData = req.body;
    
    logger.debug('Creating agent', { agentData });
    
    // Create the agent in the cognitive mesh
    const agent = await cognitiveMesh.registerAgent(agentData);
    
    logger.info('Agent created', { agentId: agent.id, name: agent.name });
    
    res.status(201).json({
      success: true,
      data: agent
    });
  } catch (error) {
    logger.error('Error creating agent:', error);
    next(error);
  }
});

/**
 * @swagger
 * /agents/{id}:
 *   put:
 *     summary: Update an agent
 *     description: Update an existing agent's details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               capabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *               trustScore:
 *                 type: number
 *               status:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Updated agent
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.put('/:id', validate(schemas.agent.update), async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      throw new NotFoundError('Agent', req.params.id);
    }
    
    logger.debug('Updating agent', { agentId: req.params.id, updates: req.body });
    
    const updatedAgent = await Agent.update(req.params.id, req.body);
    
    logger.info('Agent updated', { agentId: updatedAgent.id });
    
    res.json({
      success: true,
      data: updatedAgent
    });
  } catch (error) {
    logger.error('Error updating agent:', error);
    next(error);
  }
});

/**
 * @swagger
 * /agents/{id}:
 *   delete:
 *     summary: Delete an agent
 *     description: Remove an agent from the network
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent deleted
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', validate(schemas.agent.getOne), async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      throw new NotFoundError('Agent', req.params.id);
    }
    
    logger.debug('Deleting agent', { agentId: req.params.id });
    
    const success = await Agent.delete(req.params.id);
    
    if (!success) {
      throw new Error('Failed to delete agent');
    }
    
    logger.info('Agent deleted', { agentId: req.params.id });
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error('Error deleting agent:', error);
    next(error);
  }
});

/**
 * @swagger
 * /agents/{id}/capabilities:
 *   post:
 *     summary: Add a capability
 *     description: Add a new capability to an agent
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - capability
 *             properties:
 *               capability:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated agent with new capability
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.post('/:id/capabilities', validate(schemas.agent.addCapability), async (req, res, next) => {
  try {
    const { capability } = req.body;
    
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      throw new NotFoundError('Agent', req.params.id);
    }
    
    if (agent.capabilities.includes(capability)) {
      throw new ConflictError(`Agent already has capability: ${capability}`, {
        agentId: req.params.id,
        capability
      });
    }
    
    logger.debug('Adding capability to agent', { 
      agentId: req.params.id, 
      capability 
    });
    
    const updatedAgent = await Agent.addCapability(req.params.id, capability);
    
    logger.info('Agent capability added', { 
      agentId: updatedAgent.id, 
      capability 
    });
    
    res.json({
      success: true,
      data: updatedAgent
    });
  } catch (error) {
    logger.error('Error adding capability:', error);
    next(error);
  }
});

/**
 * @swagger
 * /agents/{id}/capabilities/{capability}:
 *   delete:
 *     summary: Remove a capability
 *     description: Remove a capability from an agent
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *       - in: path
 *         name: capability
 *         required: true
 *         schema:
 *           type: string
 *         description: Capability to remove
 *     responses:
 *       200:
 *         description: Updated agent
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.delete('/:id/capabilities/:capability', async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      throw new NotFoundError('Agent', req.params.id);
    }
    
    logger.debug('Removing capability from agent', { 
      agentId: req.params.id, 
      capability: req.params.capability 
    });
    
    const updatedAgent = await Agent.removeCapability(req.params.id, req.params.capability);
    
    logger.info('Agent capability removed', { 
      agentId: updatedAgent.id, 
      capability: req.params.capability 
    });
    
    res.json({
      success: true,
      data: updatedAgent
    });
  } catch (error) {
    logger.error('Error removing capability:', error);
    next(error);
  }
});

/**
 * @swagger
 * /agents/{id}/connections:
 *   get:
 *     summary: Get agent connections
 *     description: Find all connected agents for a specific agent
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *       - in: query
 *         name: maxDepth
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Maximum connection depth to traverse
 *       - in: query
 *         name: minStrength
 *         schema:
 *           type: number
 *           default: 0
 *           minimum: 0
 *           maximum: 1
 *         description: Minimum pathway strength
 *     responses:
 *       200:
 *         description: Connected agents
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.get('/:id/connections', validate(schemas.agent.getOne), async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      throw new NotFoundError('Agent', req.params.id);
    }
    
    const options = {
      maxDepth: parseInt(req.query.maxDepth || '1', 10),
      minStrength: parseFloat(req.query.minStrength || '0')
    };
    
    logger.debug('Finding connections for agent', { 
      agentId: req.params.id, 
      options 
    });
    
    const connections = cognitiveMesh.findConnections(req.params.id, options);
    
    res.json({
      success: true,
      count: connections.length,
      data: connections
    });
  } catch (error) {
    logger.error('Error fetching connections:', error);
    next(error);
  }
});

module.exports = router; 