/**
 * Error handling utilities for AETHERMIND
 * 
 * This module provides custom error classes to standardize
 * error handling throughout the application.
 */

/**
 * Base error class for AETHERMIND application
 */
class AethermindError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        name: this.name,
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}

/**
 * Error representing a resource that wasn't found
 */
class NotFoundError extends AethermindError {
  constructor(resource, id, message = null) {
    super(
      message || `${resource} with ID '${id}' not found`,
      404,
      'RESOURCE_NOT_FOUND',
      { resource, id }
    );
  }
}

/**
 * Error representing validation failure
 */
class ValidationError extends AethermindError {
  constructor(message, details) {
    super(
      message,
      400,
      'VALIDATION_ERROR',
      details
    );
  }
}

/**
 * Error representing a conflict with existing resources
 */
class ConflictError extends AethermindError {
  constructor(message, details) {
    super(
      message,
      409,
      'CONFLICT',
      details
    );
  }
}

/**
 * Error representing unauthorized access
 */
class AuthorizationError extends AethermindError {
  constructor(message = 'Unauthorized access') {
    super(
      message,
      401,
      'UNAUTHORIZED'
    );
  }
}

/**
 * Error for cross-chain operations
 */
class ChainError extends AethermindError {
  constructor(message, chainId, details = null) {
    super(
      message,
      500,
      'CHAIN_ERROR',
      { chainId, ...details }
    );
  }
}

/**
 * Error for cognitive mesh operations
 */
class CognitiveMeshError extends AethermindError {
  constructor(message, code = 'COGNITIVE_MESH_ERROR', details = null) {
    super(
      message,
      500,
      code,
      details
    );
  }
}

/**
 * Middleware for handling errors in Express
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // If the error is one of our custom errors
  if (err instanceof AethermindError) {
    return res.status(err.status).json(err.toJSON());
  }

  // Handle Mongoose/MongoDB validation errors
  if (err.name === 'ValidationError') {
    const validationError = new ValidationError(
      'Validation failed',
      Object.keys(err.errors).reduce((errors, key) => {
        errors[key] = err.errors[key].message;
        return errors;
      }, {})
    );
    return res.status(validationError.status).json(validationError.toJSON());
  }

  // Handle other errors
  const internalError = new AethermindError(
    process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  );

  return res.status(internalError.status).json(internalError.toJSON());
}

module.exports = {
  AethermindError,
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthorizationError,
  ChainError,
  CognitiveMeshError,
  errorHandler
}; 