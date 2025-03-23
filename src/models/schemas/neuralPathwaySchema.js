/**
 * Mongoose Schema for Neural Pathway
 * 
 * This defines the database schema for the Neural Pathway model.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the neural pathway schema
const NeuralPathwaySchema = new Schema({
  sourceAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: [true, 'Source agent ID is required']
  },
  targetAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: [true, 'Target agent ID is required']
  },
  strength: {
    type: Number,
    default: 1.0,
    min: [0, 'Strength must be between 0 and 1'],
    max: [1, 'Strength must be between 0 and 1']
  },
  bidirectional: {
    type: Boolean,
    default: false
  },
  established: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: null
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },
  tokenId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure uniqueness of paths between agents
NeuralPathwaySchema.index({ sourceAgentId: 1, targetAgentId: 1 }, { unique: true });

// Additional indexes for performance
NeuralPathwaySchema.index({ strength: 1 });
NeuralPathwaySchema.index({ bidirectional: 1 });
NeuralPathwaySchema.index({ established: 1 });
NeuralPathwaySchema.index({ lastUsed: 1 });
NeuralPathwaySchema.index({ usageCount: 1 });
NeuralPathwaySchema.index({ tokenId: 1 });
NeuralPathwaySchema.index({ status: 1 });

/**
 * Virtual to get the source agent
 */
NeuralPathwaySchema.virtual('sourceAgent', {
  ref: 'Agent',
  localField: 'sourceAgentId',
  foreignField: '_id',
  justOne: true
});

/**
 * Virtual to get the target agent
 */
NeuralPathwaySchema.virtual('targetAgent', {
  ref: 'Agent',
  localField: 'targetAgentId',
  foreignField: '_id',
  justOne: true
});

/**
 * Pre-save middleware to handle any necessary transformations
 */
NeuralPathwaySchema.pre('save', function(next) {
  // If this is a new pathway, set the established date
  if (this.isNew && !this.established) {
    this.established = new Date();
  }
  next();
});

/**
 * Instance method to record pathway usage
 */
NeuralPathwaySchema.methods.recordUsage = function() {
  this.lastUsed = new Date();
  this.usageCount += 1;
  return this.save();
};

/**
 * Instance method to generate a token for this pathway
 */
NeuralPathwaySchema.methods.generateToken = function() {
  if (this.tokenId) {
    throw new Error(`Pathway already has a token (${this.tokenId})`);
  }
  
  // In a real implementation, this would call a blockchain service
  // For the MVP, we'll simulate it
  this.tokenId = `npt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  // Add token metadata
  if (!this.metadata) {
    this.metadata = new Map();
  }
  
  this.metadata.set('tokenGenerated', new Date());
  this.metadata.set('tokenType', 'NPT-V1');
  
  return this.save();
};

// Create the model
const NeuralPathwayModel = mongoose.model('NeuralPathway', NeuralPathwaySchema);

module.exports = NeuralPathwayModel; 