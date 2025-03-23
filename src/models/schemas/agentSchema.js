/**
 * Mongoose Schema for Agent
 * 
 * This defines the database schema for the Agent model.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the agent schema
const AgentSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Agent name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  capabilities: {
    type: [String],
    default: []
  },
  specializations: {
    type: [String],
    default: []
  },
  trustScore: {
    type: Number,
    default: 0.5,
    min: [0, 'Trust score must be between 0 and 1'],
    max: [1, 'Trust score must be between 0 and 1']
  },
  chain: {
    type: String,
    enum: {
      values: ['ethereum', 'bnb', 'solana'],
      message: '{VALUE} is not a supported blockchain'
    },
    default: 'ethereum'
  },
  owner: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'learning'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  sourceChain: {
    type: String,
    default: null
  },
  sourceAgentId: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for related pathways
AgentSchema.virtual('outgoingPathways', {
  ref: 'NeuralPathway',
  localField: '_id',
  foreignField: 'sourceAgentId'
});

AgentSchema.virtual('incomingPathways', {
  ref: 'NeuralPathway',
  localField: '_id',
  foreignField: 'targetAgentId'
});

// Index for faster lookups
AgentSchema.index({ name: 1 });
AgentSchema.index({ chain: 1 });
AgentSchema.index({ owner: 1 });
AgentSchema.index({ 'capabilities': 1 });
AgentSchema.index({ 'specializations': 1 });
AgentSchema.index({ trustScore: 1 });
AgentSchema.index({ status: 1 });

/**
 * Pre-save middleware to handle any necessary transformations
 */
AgentSchema.pre('save', function(next) {
  // If this is the first save, generate a unique ID
  if (this.isNew) {
    // Any pre-save operations would go here
  }
  next();
});

// Create the model
const AgentModel = mongoose.model('Agent', AgentSchema);

module.exports = AgentModel; 