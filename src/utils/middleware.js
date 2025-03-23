/**
 * Middleware utilities for AETHERMIND
 * 
 * This module provides middleware functions for Express.
 */

const logger = require('./logger');
const { AuthorizationError } = require('./errors');

/**
 * Request logger middleware
 */
function requestLogger(req, res, next) {
  logger.debug(`${req.method} ${req.url}`, {
    ip: req.ip,
    params: req.params,
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
}

/**
 * API key authentication middleware
 * This is a simple API key authentication for the MVP
 * In a production app, this would be replaced with JWT or OAuth
 */
function apiKeyAuth(req, res, next) {
  // Skip auth in development unless explicitly enabled
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_AUTH !== 'true') {
    return next();
  }

  const apiKey = req.header('X-API-Key');
  const configuredApiKey = process.env.API_KEY;

  if (!configuredApiKey) {
    logger.warn('API_KEY environment variable not set');
    return next();
  }

  if (!apiKey || apiKey !== configuredApiKey) {
    logger.warn('Invalid API key attempt', {
      ip: req.ip,
      path: req.path
    });
    return next(new AuthorizationError('Invalid API key'));
  }

  next();
}

/**
 * CORS configuration middleware
 */
function corsConfig(req, res, next) {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}

/**
 * Timeout middleware
 * Sets a timeout for the request
 */
function timeout(seconds = 30) {
  const ms = seconds * 1000;
  
  return (req, res, next) => {
    // Set timeout
    req.timeout = setTimeout(() => {
      logger.warn(`Request timeout: ${req.method} ${req.url}`);
      res.status(503).json({
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'Request timed out'
        }
      });
    }, ms);
    
    // Clear timeout when response is sent
    res.on('finish', () => {
      if (req.timeout) {
        clearTimeout(req.timeout);
      }
    });
    
    next();
  };
}

/**
 * Response time logger middleware
 * Logs the response time for each request
 */
function responseTime(req, res, next) {
  const start = Date.now();
  
  // Log response time when response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.url} - ${duration}ms`);
    }
  });
  
  next();
}

module.exports = {
  requestLogger,
  apiKeyAuth,
  corsConfig,
  timeout,
  responseTime
}; 