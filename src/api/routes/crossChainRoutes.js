/**
 * Cross-Chain API Routes
 * 
 * Endpoints for managing cross-chain operations in the AETHERMIND cognitive network.
 */

const express = require('express');
const { getChainAdapter } = require('../../core/chainAdapter');
const { Agent } = require('../../models/agent');
const { NeuralPathway } = require('../../models/neuralPathway');

const router = express.Router();

/**
 * @route   GET /api/cross-chain/status
 * @desc    Get status of supported chains
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    // Check if cross-chain bridge is enabled
    if (!process.env.ENABLE_CROSS_CHAIN_BRIDGE || process.env.ENABLE_CROSS_CHAIN_BRIDGE === 'false') {
      return res.status(403).json({
        success: false,
        error: 'Cross-chain bridge is currently disabled'
      });
    }
    
    const supportedChains = ['ethereum', 'bnb', 'solana'];
    const chainStatus = {};
    
    // Initialize chain adapters and check status
    for (const chain of supportedChains) {
      try {
        const adapter = await getChainAdapter(chain, { autoConnect: true });
        const isConnected = await adapter.isConnected();
        const networkId = isConnected ? await adapter.getNetworkId() : null;
        
        chainStatus[chain] = {
          connected: isConnected,
          networkId,
          status: isConnected ? 'online' : 'offline'
        };
        
        // Clean up connection
        if (isConnected) {
          await adapter.disconnect();
        }
      } catch (error) {
        console.error(`Error checking status for ${chain}:`, error);
        chainStatus[chain] = {
          connected: false,
          error: error.message,
          status: 'error'
        };
      }
    }
    
    res.json({
      success: true,
      enabledChains: supportedChains,
      chainStatus
    });
  } catch (error) {
    console.error('Error fetching cross-chain status:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/cross-chain/agents/:chain
 * @desc    Get agents on a specific chain
 * @access  Public
 */
router.get('/agents/:chain', async (req, res) => {
  try {
    const { chain } = req.params;
    
    // Check if chain is supported
    const supportedChains = ['ethereum', 'bnb', 'solana'];
    if (!supportedChains.includes(chain)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported chain: ${chain}`
      });
    }
    
    // Get agents on the specified chain
    const agents = await Agent.findAll({ chain });
    
    res.json({
      success: true,
      count: agents.length,
      chain,
      data: agents
    });
  } catch (error) {
    console.error('Error fetching agents by chain:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/cross-chain/deploy
 * @desc    Deploy an agent to a different chain
 * @access  Public
 */
router.post('/deploy', async (req, res) => {
  try {
    const { agentId, targetChain } = req.body;
    
    // Check if cross-chain bridge is enabled
    if (!process.env.ENABLE_CROSS_CHAIN_BRIDGE || process.env.ENABLE_CROSS_CHAIN_BRIDGE === 'false') {
      return res.status(403).json({
        success: false,
        error: 'Cross-chain bridge is currently disabled'
      });
    }
    
    // Basic validation
    if (!agentId || !targetChain) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID and target chain are required'
      });
    }
    
    // Check if chain is supported
    const supportedChains = ['ethereum', 'bnb', 'solana'];
    if (!supportedChains.includes(targetChain)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported target chain: ${targetChain}`
      });
    }
    
    // Get the agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    // Check if agent is already on that chain
    if (agent.chain === targetChain) {
      return res.status(400).json({
        success: false,
        error: `Agent is already deployed on ${targetChain}`
      });
    }
    
    // Initialize chain adapter for target chain
    const adapter = await getChainAdapter(targetChain);
    
    // In a real implementation, this would deploy the agent to the target chain
    // For the MVP, we'll just create a new agent with the same details but different chain
    
    const crossChainAgent = {
      ...agent,
      id: undefined, // Let the system generate a new ID
      chain: targetChain,
      sourceChain: agent.chain,
      sourceAgentId: agent.id,
      metadata: {
        ...agent.metadata,
        crossChainDeployment: {
          timestamp: new Date(),
          sourceChain: agent.chain,
          sourceAgentId: agent.id
        }
      }
    };
    
    const newAgent = await Agent.create(crossChainAgent);
    
    // Create a cross-chain neural pathway between the original and new agent
    await NeuralPathway.create({
      sourceAgentId: agent.id,
      targetAgentId: newAgent.id,
      bidirectional: true,
      strength: 1.0,
      metadata: {
        type: 'cross-chain',
        sourceChain: agent.chain,
        targetChain: targetChain
      }
    });
    
    res.status(201).json({
      success: true,
      sourceAgent: agent,
      deployedAgent: newAgent
    });
  } catch (error) {
    console.error('Error deploying agent to different chain:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/cross-chain/bridge
 * @desc    Create a cross-chain neural pathway between agents on different chains
 * @access  Public
 */
router.post('/bridge', async (req, res) => {
  try {
    const { sourceAgentId, targetAgentId, ...pathwayData } = req.body;
    
    // Check if cross-chain bridge is enabled
    if (!process.env.ENABLE_CROSS_CHAIN_BRIDGE || process.env.ENABLE_CROSS_CHAIN_BRIDGE === 'false') {
      return res.status(403).json({
        success: false,
        error: 'Cross-chain bridge is currently disabled'
      });
    }
    
    // Basic validation
    if (!sourceAgentId || !targetAgentId) {
      return res.status(400).json({
        success: false,
        error: 'Source and target agent IDs are required'
      });
    }
    
    // Get the agents
    const sourceAgent = await Agent.findById(sourceAgentId);
    if (!sourceAgent) {
      return res.status(404).json({
        success: false,
        error: 'Source agent not found'
      });
    }
    
    const targetAgent = await Agent.findById(targetAgentId);
    if (!targetAgent) {
      return res.status(404).json({
        success: false,
        error: 'Target agent not found'
      });
    }
    
    // Check if agents are on different chains
    if (sourceAgent.chain === targetAgent.chain) {
      return res.status(400).json({
        success: false,
        error: 'Both agents are on the same chain. Use regular neural pathway instead'
      });
    }
    
    // Check if a pathway already exists
    const existingPathway = await NeuralPathway.findByAgents(sourceAgentId, targetAgentId);
    if (existingPathway) {
      return res.status(400).json({
        success: false,
        error: 'A neural pathway already exists between these agents'
      });
    }
    
    // Create a cross-chain neural pathway
    const crossChainPathway = await NeuralPathway.create({
      sourceAgentId,
      targetAgentId,
      bidirectional: pathwayData.bidirectional || true,
      strength: pathwayData.strength || 1.0,
      metadata: {
        ...pathwayData.metadata,
        type: 'cross-chain',
        sourceChain: sourceAgent.chain,
        targetChain: targetAgent.chain
      },
      ...pathwayData
    });
    
    res.status(201).json({
      success: true,
      data: crossChainPathway
    });
  } catch (error) {
    console.error('Error creating cross-chain neural pathway:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/cross-chain/pathways
 * @desc    Get all cross-chain neural pathways
 * @access  Public
 */
router.get('/pathways', async (req, res) => {
  try {
    // Filter for pathways with cross-chain metadata
    const pathways = await NeuralPathway.findAll();
    
    const crossChainPathways = pathways.filter(pathway => 
      pathway.metadata && 
      pathway.metadata.type === 'cross-chain'
    );
    
    res.json({
      success: true,
      count: crossChainPathways.length,
      data: crossChainPathways
    });
  } catch (error) {
    console.error('Error fetching cross-chain pathways:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router; 