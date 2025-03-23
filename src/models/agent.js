/**
 * Agent Model
 * 
 * Represents an intelligent agent in the AETHERMIND cognitive network.
 * Each agent has unique capabilities, a trust score, and can form neural
 * pathways with other agents.
 */

// This is a simplified in-memory implementation
// In a production environment, this would use a database like MongoDB

class Agent {
  static agents = [];
  static idCounter = 1;

  /**
   * Create a new agent
   * @param {Object} data - Agent configuration
   * @returns {Object} - The created agent
   */
  static async create(data) {
    const id = data.id || `agent-${Agent.idCounter++}`;
    
    const agent = {
      id,
      name: data.name || `Agent ${id}`,
      description: data.description || '',
      capabilities: data.capabilities || [],
      specializations: data.specializations || [],
      trustScore: data.trustScore || 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: data.metadata || {},
      chain: data.chain || 'ethereum',
      owner: data.owner || null,
      status: 'active',
      ...data
    };
    
    // Store in memory
    Agent.agents.push(agent);
    
    return agent;
  }

  /**
   * Find an agent by ID
   * @param {string} id - Agent ID
   * @returns {Object|null} - The agent or null if not found
   */
  static async findById(id) {
    return Agent.agents.find(agent => agent.id === id) || null;
  }

  /**
   * Find all agents matching a filter
   * @param {Object} filter - Filter criteria
   * @returns {Array} - Array of matching agents
   */
  static async findAll(filter = {}) {
    let filteredAgents = [...Agent.agents];
    
    // Apply filters if provided
    if (filter.capabilities) {
      filteredAgents = filteredAgents.filter(agent => 
        filter.capabilities.every(cap => agent.capabilities.includes(cap))
      );
    }
    
    if (filter.minTrustScore) {
      filteredAgents = filteredAgents.filter(agent => 
        agent.trustScore >= filter.minTrustScore
      );
    }
    
    if (filter.chain) {
      filteredAgents = filteredAgents.filter(agent => 
        agent.chain === filter.chain
      );
    }
    
    if (filter.owner) {
      filteredAgents = filteredAgents.filter(agent => 
        agent.owner === filter.owner
      );
    }
    
    if (filter.status) {
      filteredAgents = filteredAgents.filter(agent => 
        agent.status === filter.status
      );
    }
    
    return filteredAgents;
  }

  /**
   * Update an agent
   * @param {string} id - Agent ID
   * @param {Object} updateData - Data to update
   * @returns {Object|null} - Updated agent or null if not found
   */
  static async update(id, updateData) {
    const index = Agent.agents.findIndex(agent => agent.id === id);
    
    if (index === -1) {
      return null;
    }
    
    const updatedAgent = {
      ...Agent.agents[index],
      ...updateData,
      updatedAt: new Date()
    };
    
    Agent.agents[index] = updatedAgent;
    return updatedAgent;
  }

  /**
   * Delete an agent
   * @param {string} id - Agent ID
   * @returns {boolean} - Whether deletion was successful
   */
  static async delete(id) {
    const initialLength = Agent.agents.length;
    Agent.agents = Agent.agents.filter(agent => agent.id !== id);
    return Agent.agents.length < initialLength;
  }

  /**
   * Update an agent's trust score
   * @param {string} id - Agent ID
   * @param {number} adjustment - Amount to adjust trust (positive or negative)
   * @returns {Object|null} - Updated agent or null if not found
   */
  static async updateTrustScore(id, adjustment) {
    const agent = await Agent.findById(id);
    
    if (!agent) {
      return null;
    }
    
    let newScore = agent.trustScore + adjustment;
    
    // Clamp to 0-1 range
    newScore = Math.max(0, Math.min(1, newScore));
    
    return Agent.update(id, { trustScore: newScore });
  }

  /**
   * Add a capability to an agent
   * @param {string} id - Agent ID
   * @param {string} capability - Capability to add
   * @returns {Object|null} - Updated agent or null if not found
   */
  static async addCapability(id, capability) {
    const agent = await Agent.findById(id);
    
    if (!agent) {
      return null;
    }
    
    if (agent.capabilities.includes(capability)) {
      return agent; // Already has this capability
    }
    
    const updatedCapabilities = [...agent.capabilities, capability];
    return Agent.update(id, { capabilities: updatedCapabilities });
  }

  /**
   * Remove a capability from an agent
   * @param {string} id - Agent ID
   * @param {string} capability - Capability to remove
   * @returns {Object|null} - Updated agent or null if not found
   */
  static async removeCapability(id, capability) {
    const agent = await Agent.findById(id);
    
    if (!agent) {
      return null;
    }
    
    const updatedCapabilities = agent.capabilities.filter(cap => cap !== capability);
    return Agent.update(id, { capabilities: updatedCapabilities });
  }
}

module.exports = { Agent }; 