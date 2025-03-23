require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const { initializeCognitiveMesh } = require('./core/cognitiveMesh');
const agentRoutes = require('./api/routes/agentRoutes');
const pathwayRoutes = require('./api/routes/pathwayRoutes');
const crossChainRoutes = require('./api/routes/crossChainRoutes');
const tokenRoutes = require('./api/routes/tokenRoutes');
const { errorHandler } = require('./utils/errors');
const logger = require('./utils/logger');
const { connectDatabase } = require('./utils/database');
const { 
  requestLogger, 
  apiKeyAuth, 
  corsConfig, 
  timeout, 
  responseTime 
} = require('./utils/middleware');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(corsConfig);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes by default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.'
    }
  }
});

// Apply rate limiter to API endpoints
app.use('/api', apiLimiter);

// Request parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: logger.stream }));
app.use(requestLogger);
app.use(responseTime);

// Apply timeout to all requests
app.use(timeout(30)); // 30 seconds timeout

// API Key authentication
app.use('/api', apiKeyAuth);

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AETHERMIND API',
      version: '0.1.0',
      description: 'API for the AETHERMIND decentralized cognitive network',
      contact: {
        name: 'AETHERMIND Team'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    },
    security: [
      {
        apiKey: []
      }
    ]
  },
  apis: ['./src/api/routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api/agents', agentRoutes);
app.use('/api/pathways', pathwayRoutes);
app.use('/api/cross-chain', crossChainRoutes);
app.use('/api/tokens', tokenRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'AETHERMIND Cognitive Network',
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Blockchain status endpoint
app.get('/blockchain/status', async (req, res, next) => {
  try {
    const blockchain = require('./utils/blockchain');
    const results = await blockchain.checkAllChains();
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Error checking blockchain status:', error);
    next(error);
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`
    }
  });
});

// Main startup function
async function startServer() {
  try {
    // Connect to the database
    await connectDatabase();
    logger.info('Database connection established');
    
    // Initialize the cognitive mesh
    await initializeCognitiveMesh();
    logger.info('Cognitive Mesh initialized successfully');
    
    // Start the server
    app.listen(PORT, () => {
      logger.info(`AETHERMIND server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start the server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Promise Rejection:', error);
  // For production, we might want to exit the process
  // process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // In production, we should exit and let the process manager restart
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  // Close any resources here (database, etc.)
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  // Close any resources here (database, etc.)
  process.exit(0);
});

module.exports = app; 