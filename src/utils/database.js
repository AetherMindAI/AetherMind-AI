/**
 * Database utility for AETHERMIND
 * 
 * This module provides MongoDB connection handling using Mongoose.
 */

const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Connect to MongoDB
 */
async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aethermind';
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
  };

  try {
    await mongoose.connect(uri, options);
    logger.info('Connected to MongoDB');
    
    // Log when database connection is lost
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Log when database connection is re-established
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Log errors
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    
    // If we're in development, we can continue with in-memory storage
    // Otherwise, we'll rethrow the error
    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      logger.warn('Continuing with in-memory storage');
      return null;
    }
  }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }
}

/**
 * Check if database is connected
 */
function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  isConnected,
  connection: mongoose.connection
}; 