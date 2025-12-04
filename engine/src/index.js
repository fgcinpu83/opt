// src/index.js - Entry point for Arbitrage Bot Engine
require('dotenv').config();
const logger = require('./config/logger');
const { createServer } = require('./server');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeMetrics } = require('./utils/metrics');

let server;
let httpServer;

async function start() {
  try {
    logger.info('Starting Arbitrage Bot Engine...');
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Paper Trading Mode: ${process.env.PAPER_TRADING_MODE}`);

    // Initialize metrics
    initializeMetrics();
    logger.info('Metrics initialized');

    // Connect to databases
    await connectDatabase();
    logger.info('PostgreSQL connected');

    await connectRedis();
    logger.info('Redis connected');

    // Create and start server
    const app = await createServer();
    const PORT = process.env.PORT || 3000;
    
    httpServer = app.listen(PORT, () => {
      logger.info(`Engine HTTP Server listening on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API docs: http://localhost:${PORT}/api/docs`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      // Close HTTP server
      if (httpServer) {
        httpServer.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Close database connections
      const { closeDatabase } = require('./config/database');
      const { closeRedis } = require('./config/redis');
      
      try {
        await closeDatabase();
        logger.info('Database connection closed');
        
        await closeRedis();
        logger.info('Redis connection closed');
        
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

  } catch (error) {
    logger.error('Failed to start engine:', error);
    process.exit(1);
  }
}

// Start the engine
start();
