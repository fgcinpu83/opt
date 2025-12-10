// src/index.js - Entry point for Arbitrage Bot Engine
require('dotenv').config();
const logger = require('./config/logger');
const { createServer } = require('./server');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeMetrics } = require('./utils/metrics');
const { initializeWebSocket, closeWebSocket } = require('./websocket/opportunities.ws');

let server;
let httpServer;

async function start() {
  try {
    console.log('🚀 Starting Arbitrage Bot Engine...');
    logger.info('Starting Arbitrage Bot Engine...');
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Paper Trading Mode: ${process.env.PAPER_TRADING_MODE}`);

    // Initialize metrics
    initializeMetrics();
    console.log('✅ Metrics initialized');
    logger.info('Metrics initialized');

    // Connect to databases with error handling
    try {
      await connectDatabase();
      console.log('✅ PostgreSQL connected');
      logger.info('PostgreSQL connected');
    } catch (dbError) {
      console.error('⚠️  PostgreSQL connection failed:', dbError.message);
      logger.error('PostgreSQL connection failed, continuing anyway:', dbError);
    }

    try {
      await connectRedis();
      console.log('✅ Redis connected');
      logger.info('Redis connected');
    } catch (redisError) {
      console.error('⚠️  Redis connection failed:', redisError.message);
      logger.error('Redis connection failed, continuing anyway:', redisError);
    }

    // Create and start server - THIS IS CRITICAL
    const app = await createServer();
    const PORT = process.env.PORT || 3000;
    
    httpServer = app.listen(PORT, '0.0.0.0', () => {
      console.log('═══════════════════════════════════════════════════════');
      console.log(`🚀 SERVER STARTED ON PORT ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/api/docs`);
      console.log(`🔌 API base: http://localhost:${PORT}/api/v1`);
      console.log(`🌐 WebSocket: ws://localhost:${PORT}/ws/opportunities`);
      console.log('═══════════════════════════════════════════════════════');
      logger.info(`Engine HTTP Server listening on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API docs: http://localhost:${PORT}/api/docs`);
      
      // Initialize WebSocket server after HTTP server is listening
      initializeWebSocket(httpServer);
      console.log('✅ WebSocket server initialized');
      logger.info('WebSocket server initialized on /ws/opportunities');
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
        // Close WebSocket server first
        closeWebSocket();
        logger.info('WebSocket server closed');
        
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
