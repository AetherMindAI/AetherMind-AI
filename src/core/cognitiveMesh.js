/**
 * Cognitive Mesh - Core implementation
 * 
 * This module provides the foundational architecture for the AETHERMIND cognitive
 * network, enabling AI agents to connect, share knowledge, and evolve collectively.
 */

const { EventEmitter } = require('events');
const { Agent } = require('../models/agent');
const { NeuralPathway } = require('../models/neuralPathway');
const { getChainAdapter } = require('./chainAdapter');

class CognitiveMesh extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.pathways = new Map();
    this.initialized = false;
    this.supportedChains = ['ethereum', 'bnb', 'solana'];
    this.chainAdapters = {};
  }

  /**
   * Initialize the cognitive mesh with configuration
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log('Initializing Cognitive Mesh...');
    
    // Initialize chain adapters
    for (const chain of this.supportedChains) {
      try {
        this.chainAdapters[chain] = await getChainAdapter(chain);
        console.log(`Chain adapter for ${chain} initialized`);
      } catch (error) {
        console.error(`Failed to initialize chain adapter for ${chain}:`, error);
      }
    }

    // Load registered agents from storage
    try {
      const agents = await Agent.findAll();
      agents.forEach(agent => {
        this.registerAgent(agent, false);
      });
      console.log(`Loaded ${agents.length} agents`);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }

    // Load established neural pathways
    try {
      const pathways = await NeuralPathway.findAll();
      pathways.forEach(pathway => {
        this.registerPathway(pathway, false);
      });
      console.log(`Loaded ${pathways.length} neural pathways`);
    } catch (error) {
      console.error('Failed to load neural pathways:', error);
    }

    this.initialized = true;
    this.emit('initialized');
    return true;
  }

  /**
   * Register a new agent in the cognitive mesh
   * @param {Object} agentData - Agent configuration data
   * @param {boolean} persist - Whether to persist the agent to storage
   */
  async registerAgent(agentData, persist = true) {
    if (this.agents.has(agentData.id)) {
      throw new Error(`Agent with ID ${agentData.id} already exists`);
    }

    const agent = persist ? await Agent.create(agentData) : agentData;
    this.agents.set(agent.id, agent);
    this.emit('agentRegistered', agent);
    return agent;
  }

  /**
   * Establish a neural pathway between two agents
   * @param {string} sourceAgentId - Source agent ID
   * @param {string} targetAgentId - Target agent ID
   * @param {Object} pathwayData - Neural pathway configuration
   * @param {boolean} persist - Whether to persist the pathway to storage
   */
  async establishPathway(sourceAgentId, targetAgentId, pathwayData, persist = true) {
    if (!this.agents.has(sourceAgentId)) {
      throw new Error(`Source agent ${sourceAgentId} not found`);
    }

    if (!this.agents.has(targetAgentId)) {
      throw new Error(`Target agent ${targetAgentId} not found`);
    }

    const pathwayKey = `${sourceAgentId}-${targetAgentId}`;
    
    if (this.pathways.has(pathwayKey)) {
      throw new Error(`Pathway already exists between agents ${sourceAgentId} and ${targetAgentId}`);
    }

    const pathwayObject = {
      sourceAgentId,
      targetAgentId,
      strength: pathwayData.strength || 1.0,
      bidirectional: pathwayData.bidirectional || false,
      metadata: pathwayData.metadata || {},
      createdAt: new Date(),
      ...pathwayData
    };

    const pathway = persist ? await NeuralPathway.create(pathwayObject) : pathwayObject;
    this.pathways.set(pathwayKey, pathway);

    // If the pathway is bidirectional, also register the reverse pathway
    if (pathway.bidirectional) {
      const reverseKey = `${targetAgentId}-${sourceAgentId}`;
      this.pathways.set(reverseKey, pathway);
    }

    this.emit('pathwayEstablished', pathway);
    return pathway;
  }

  /**
   * Register an existing neural pathway in the cognitive mesh
   * @param {Object} pathwayData - Neural pathway data
   * @param {boolean} persist - Whether to persist the pathway to storage
   */
  async registerPathway(pathwayData, persist = false) {
    const { sourceAgentId, targetAgentId } = pathwayData;
    const pathwayKey = `${sourceAgentId}-${targetAgentId}`;
    
    this.pathways.set(pathwayKey, pathwayData);
    
    if (pathwayData.bidirectional) {
      const reverseKey = `${targetAgentId}-${sourceAgentId}`;
      this.pathways.set(reverseKey, pathwayData);
    }

    if (persist) {
      await NeuralPathway.create(pathwayData);
    }

    this.emit('pathwayRegistered', pathwayData);
    return pathwayData;
  }

  /**
   * Query the cognitive mesh for agents matching specific criteria
   * @param {Object} criteria - Query criteria
   */
  queryAgents(criteria = {}) {
    const results = Array.from(this.agents.values()).filter(agent => {
      // Apply filtering based on criteria
      if (criteria.capabilities && !criteria.capabilities.every(cap => agent.capabilities.includes(cap))) {
        return false;
      }
      
      if (criteria.minTrustScore && agent.trustScore < criteria.minTrustScore) {
        return false;
      }
      
      if (criteria.chain && agent.chain !== criteria.chain) {
        return false;
      }
      
      return true;
    });
    
    return results;
  }

  /**
   * Find all connected agents to a specific agent
   * @param {string} agentId - Agent ID to find connections for
   * @param {Object} options - Query options
   */
  findConnections(agentId, options = {}) {
    const maxDepth = options.maxDepth || 1;
    const minStrength = options.minStrength || 0;
    
    const connections = new Map();
    const visited = new Set([agentId]);
    
    const traverse = (currentId, depth = 0) => {
      if (depth >= maxDepth) return;
      
      // Find all outgoing pathways from this agent
      Array.from(this.pathways.entries())
        .filter(([key, pathway]) => {
          return key.startsWith(`${currentId}-`) && pathway.strength >= minStrength;
        })
        .forEach(([key, pathway]) => {
          const targetId = pathway.targetAgentId;
          
          if (!visited.has(targetId)) {
            visited.add(targetId);
            connections.set(targetId, {
              agent: this.agents.get(targetId),
              pathway,
              depth: depth + 1
            });
            
            // Continue traversal
            traverse(targetId, depth + 1);
          }
        });
    };
    
    traverse(agentId);
    return Array.from(connections.values());
  }

  /**
   * Execute a collective cognition task across multiple agents
   * @param {Array} agentIds - Array of agent IDs to include in collective processing
   * @param {Object} task - Task definition
   */
  async executeCollectiveCognition(agentIds, task) {
    // Validate agents exist
    const validAgents = agentIds.filter(id => this.agents.has(id));
    
    if (validAgents.length < 2) {
      throw new Error('Collective cognition requires at least 2 valid agents');
    }
    
    // Collective processing implementation will be expanded in future versions
    const results = await Promise.all(
      validAgents.map(agentId => {
        const agent = this.agents.get(agentId);
        // Execute the task on each agent
        return this._processAgentTask(agent, task);
      })
    );
    
    // Aggregate results (simplified version)
    const aggregatedResult = this._aggregateResults(results, task);
    
    return {
      task,
      participatingAgents: validAgents,
      individualResults: results,
      aggregatedResult
    };
  }

  /**
   * Internal method to process a task on an individual agent
   * @private
   */
  async _processAgentTask(agent, task) {
    // This is a placeholder for actual agent task processing
    // In a real implementation, this would invoke the agent's capabilities
    
    return {
      agentId: agent.id,
      status: 'completed',
      result: `Agent ${agent.id} processed task ${task.id} successfully`,
      confidence: Math.random() * 0.5 + 0.5, // Placeholder confidence score
      timestamp: new Date()
    };
  }

  /**
   * Internal method to aggregate results from multiple agents
   * @private
   */
  _aggregateResults(results, task) {
    // Simple aggregation strategy - can be extended with more sophisticated approaches
    const confidenceWeightedResults = results.map(r => ({
      result: r.result,
      weight: r.confidence || 1.0
    }));
    
    // For now, just return the highest confidence result
    const sortedResults = [...confidenceWeightedResults].sort((a, b) => b.weight - a.weight);
    
    return {
      primaryResult: sortedResults[0].result,
      confidence: sortedResults[0].weight,
      consensusReached: this._checkConsensus(results),
      resultCount: results.length
    };
  }

  /**
   * Check if there is consensus among results
   * @private
   */
  _checkConsensus(results) {
    // Simplified consensus check
    // In a real implementation, this would use more sophisticated algorithms
    
    // Consider consensus reached if more than 70% of results are similar
    // This is a very simplified placeholder implementation
    return true;
  }
}

// Singleton instance
const cognitiveMesh = new CognitiveMesh();

/**
 * Initialize the cognitive mesh system
 */
async function initializeCognitiveMesh() {
  return cognitiveMesh.initialize();
}

module.exports = {
  cognitiveMesh,
  initializeCognitiveMesh
}; 