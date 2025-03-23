/**
 * Neural Pathway Model
 * 
 * Represents a connection between two agents in the AETHERMIND cognitive network.
 * Neural pathways enable knowledge sharing and collaborative reasoning between agents.
 */

// This is a simplified in-memory implementation
// In a production environment, this would use a database like MongoDB

class NeuralPathway {
  static pathways = [];
  static idCounter = 1;

  /**
   * Create a new neural pathway
   * @param {Object} data - Neural pathway configuration
   * @returns {Object} - The created neural pathway
   */
  static async create(data) {
    const id = data.id || `pathway-${NeuralPathway.idCounter++}`;
    
    if (!data.sourceAgentId || !data.targetAgentId) {
      throw new Error('Source and target agent IDs are required');
    }
    
    const pathway = {
      id,
      sourceAgentId: data.sourceAgentId,
      targetAgentId: data.targetAgentId,
      strength: data.strength || 1.0,
      bidirectional: data.bidirectional || false,
      established: data.established || new Date(),
      lastUsed: data.lastUsed || null,
      usageCount: data.usageCount || 0,
      metadata: data.metadata || {},
      tokenId: data.tokenId || null,
      status: 'active',
      ...data
    };
    
    // Store in memory
    NeuralPathway.pathways.push(pathway);
    
    return pathway;
  }

  /**
   * Find a neural pathway by ID
   * @param {string} id - Neural pathway ID
   * @returns {Object|null} - The neural pathway or null if not found
   */
  static async findById(id) {
    return NeuralPathway.pathways.find(pathway => pathway.id === id) || null;
  }

  /**
   * Find a neural pathway by source and target agent IDs
   * @param {string} sourceAgentId - Source agent ID
   * @param {string} targetAgentId - Target agent ID
   * @returns {Object|null} - The neural pathway or null if not found
   */
  static async findByAgents(sourceAgentId, targetAgentId) {
    return NeuralPathway.pathways.find(
      pathway => 
        pathway.sourceAgentId === sourceAgentId && 
        pathway.targetAgentId === targetAgentId
    ) || null;
  }

  /**
   * Find all neural pathways matching a filter
   * @param {Object} filter - Filter criteria
   * @returns {Array} - Array of matching neural pathways
   */
  static async findAll(filter = {}) {
    let filteredPathways = [...NeuralPathway.pathways];
    
    // Apply filters if provided
    if (filter.sourceAgentId) {
      filteredPathways = filteredPathways.filter(pathway => 
        pathway.sourceAgentId === filter.sourceAgentId
      );
    }
    
    if (filter.targetAgentId) {
      filteredPathways = filteredPathways.filter(pathway => 
        pathway.targetAgentId === filter.targetAgentId
      );
    }
    
    if (filter.minStrength) {
      filteredPathways = filteredPathways.filter(pathway => 
        pathway.strength >= filter.minStrength
      );
    }
    
    if (filter.bidirectional !== undefined) {
      filteredPathways = filteredPathways.filter(pathway => 
        pathway.bidirectional === filter.bidirectional
      );
    }
    
    if (filter.status) {
      filteredPathways = filteredPathways.filter(pathway => 
        pathway.status === filter.status
      );
    }
    
    return filteredPathways;
  }

  /**
   * Update a neural pathway
   * @param {string} id - Neural pathway ID
   * @param {Object} updateData - Data to update
   * @returns {Object|null} - Updated neural pathway or null if not found
   */
  static async update(id, updateData) {
    const index = NeuralPathway.pathways.findIndex(pathway => pathway.id === id);
    
    if (index === -1) {
      return null;
    }
    
    const updatedPathway = {
      ...NeuralPathway.pathways[index],
      ...updateData,
    };
    
    NeuralPathway.pathways[index] = updatedPathway;
    return updatedPathway;
  }

  /**
   * Delete a neural pathway
   * @param {string} id - Neural pathway ID
   * @returns {boolean} - Whether deletion was successful
   */
  static async delete(id) {
    const initialLength = NeuralPathway.pathways.length;
    NeuralPathway.pathways = NeuralPathway.pathways.filter(pathway => pathway.id !== id);
    return NeuralPathway.pathways.length < initialLength;
  }

  /**
   * Record usage of a neural pathway
   * @param {string} id - Neural pathway ID
   * @returns {Object|null} - Updated neural pathway or null if not found
   */
  static async recordUsage(id) {
    const pathway = await NeuralPathway.findById(id);
    
    if (!pathway) {
      return null;
    }
    
    const updateData = {
      lastUsed: new Date(),
      usageCount: pathway.usageCount + 1
    };
    
    return NeuralPathway.update(id, updateData);
  }

  /**
   * Update the strength of a neural pathway
   * @param {string} id - Neural pathway ID
   * @param {number} newStrength - New strength value
   * @returns {Object|null} - Updated neural pathway or null if not found
   */
  static async updateStrength(id, newStrength) {
    // Clamp to 0-1 range
    newStrength = Math.max(0, Math.min(1, newStrength));
    return NeuralPathway.update(id, { strength: newStrength });
  }

  /**
   * Generate a Neural Pathway Token (NPT) for a pathway
   * @param {string} id - Neural pathway ID
   * @returns {Object|null} - Updated neural pathway with token information
   */
  static async generateToken(id) {
    const pathway = await NeuralPathway.findById(id);
    
    if (!pathway) {
      return null;
    }
    
    if (pathway.tokenId) {
      throw new Error(`Pathway ${id} already has a token (${pathway.tokenId})`);
    }
    
    // In a real implementation, this would call a blockchain service
    // to mint an actual token. For the MVP, we'll simulate it.
    
    const tokenId = `npt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    const updateData = {
      tokenId,
      metadata: {
        ...pathway.metadata,
        tokenGenerated: new Date(),
        tokenType: 'NPT-V1'
      }
    };
    
    return NeuralPathway.update(id, updateData);
  }
}

module.exports = { NeuralPathway }; 