/**
 * Logging utility for AETHERMIND
 * 
 * This module provides a centralized logging service using Winston.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'aethermind' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Create a stream object for Morgan integration
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

/**
 * Log a cognitive mesh event
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
logger.logMeshEvent = (event, data) => {
  logger.info(`Cognitive Mesh Event: ${event}`, { event, data });
};

/**
 * Log a blockchain transaction
 * @param {string} chain - Chain name
 * @param {string} txHash - Transaction hash
 * @param {Object} data - Transaction data
 */
logger.logTransaction = (chain, txHash, data) => {
  logger.info(`Blockchain Transaction on ${chain}: ${txHash}`, { 
    chain, 
    txHash, 
    ...data 
  });
};

/**
 * Log API request (for debugging)
 * @param {Object} req - Express request object
 */
logger.logRequest = (req) => {
  if (process.env.LOG_REQUESTS !== 'true') return;
  
  const { method, url, params, query, body } = req;
  logger.debug('API Request', {
    method,
    url,
    params,
    query,
    body
  });
};

module.exports = logger; 