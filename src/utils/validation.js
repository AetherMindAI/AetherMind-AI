/**
 * Validation utilities for AETHERMIND
 * 
 * This module provides validation functions using Joi
 * to validate API requests.
 */

const Joi = require('joi');
const { ValidationError } = require('./errors');

/**
 * Creates middleware for validating request data against a Joi schema
 * @param {Object} schema - Joi schema with req.body, req.params, and/or req.query
 * @returns {Function} Express middleware function
 */
function validate(schema) {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    };

    // Validate request parts based on schema
    const toValidate = {};
    if (schema.body) toValidate.body = req.body;
    if (schema.params) toValidate.params = req.params;
    if (schema.query) toValidate.query = req.query;

    const { error, value } = Joi.object(schema).validate(toValidate, validationOptions);

    if (error) {
      const validationErrors = error.details.reduce((errors, detail) => {
        // Convert path like body.name to just name for cleaner error messages
        const path = detail.path.join('.').replace(/^(body|params|query)\./, '');
        errors[path] = detail.message;
        return errors;
      }, {});

      return next(new ValidationError('Validation failed', validationErrors));
    }

    // Replace request values with validated values
    if (schema.body) req.body = value.body;
    if (schema.params) req.params = value.params;
    if (schema.query) req.query = value.query;

    return next();
  };
}

// Common validation schemas
const schemas = {
  // Agent validation schemas
  agent: {
    create: {
      body: Joi.object({
        name: Joi.string().required().min(2).max(100),
        description: Joi.string().max(500),
        capabilities: Joi.array().items(Joi.string()),
        specializations: Joi.array().items(Joi.string()),
        trustScore: Joi.number().min(0).max(1).default(0.5),
        chain: Joi.string().valid('ethereum', 'bnb', 'solana').default('ethereum'),
        metadata: Joi.object().unknown(true)
      })
    },
    update: {
      params: Joi.object({
        id: Joi.string().required()
      }),
      body: Joi.object({
        name: Joi.string().min(2).max(100),
        description: Joi.string().max(500),
        capabilities: Joi.array().items(Joi.string()),
        specializations: Joi.array().items(Joi.string()),
        trustScore: Joi.number().min(0).max(1),
        status: Joi.string().valid('active', 'inactive', 'learning'),
        metadata: Joi.object().unknown(true)
      })
    },
    getOne: {
      params: Joi.object({
        id: Joi.string().required()
      })
    },
    getAll: {
      query: Joi.object({
        capabilities: Joi.string(),
        minTrustScore: Joi.number().min(0).max(1),
        chain: Joi.string().valid('ethereum', 'bnb', 'solana'),
        owner: Joi.string(),
        status: Joi.string().valid('active', 'inactive', 'learning')
      })
    },
    addCapability: {
      params: Joi.object({
        id: Joi.string().required()
      }),
      body: Joi.object({
        capability: Joi.string().required()
      })
    }
  },

  // Neural Pathway validation schemas
  pathway: {
    create: {
      body: Joi.object({
        sourceAgentId: Joi.string().required(),
        targetAgentId: Joi.string().required(),
        strength: Joi.number().min(0).max(1).default(1.0),
        bidirectional: Joi.boolean().default(false),
        metadata: Joi.object().unknown(true)
      })
    },
    update: {
      params: Joi.object({
        id: Joi.string().required()
      }),
      body: Joi.object({
        strength: Joi.number().min(0).max(1),
        bidirectional: Joi.boolean(),
        status: Joi.string().valid('active', 'inactive'),
        metadata: Joi.object().unknown(true)
      })
    },
    getOne: {
      params: Joi.object({
        id: Joi.string().required()
      })
    },
    getAll: {
      query: Joi.object({
        sourceAgentId: Joi.string(),
        targetAgentId: Joi.string(),
        minStrength: Joi.number().min(0).max(1),
        bidirectional: Joi.boolean(),
        status: Joi.string().valid('active', 'inactive')
      })
    },
    updateStrength: {
      params: Joi.object({
        id: Joi.string().required()
      }),
      body: Joi.object({
        strength: Joi.number().min(0).max(1).required()
      })
    }
  },

  // Cross-Chain validation schemas
  crossChain: {
    deploy: {
      body: Joi.object({
        agentId: Joi.string().required(),
        targetChain: Joi.string().valid('ethereum', 'bnb', 'solana').required()
      })
    },
    bridge: {
      body: Joi.object({
        sourceAgentId: Joi.string().required(),
        targetAgentId: Joi.string().required(),
        strength: Joi.number().min(0).max(1).default(1.0),
        bidirectional: Joi.boolean().default(true),
        metadata: Joi.object().unknown(true)
      })
    }
  }
};

module.exports = {
  validate,
  schemas
}; 