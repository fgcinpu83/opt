// src/routes/health.routes.js - Health check endpoints
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

// Simple health check
router.get('/', async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    paperTradingMode: process.env.PAPER_TRADING_MODE === 'true'
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    paperTradingMode: process.env.PAPER_TRADING_MODE === 'true',
    checks: {
      database: { status: 'unknown' },
      redis: { status: 'unknown' }
    }
  };

  // Check PostgreSQL
  try {
    const pool = getPool();
    const result = await pool.query('SELECT NOW()');
    health.checks.database = {
      status: 'healthy',
      responseTime: result.duration || 'N/A',
      timestamp: result.rows[0].now
    };
  } catch (error) {
    health.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'degraded';
    logger.error('Database health check failed:', error);
  }

  // Check Redis
  try {
    const redis = getRedisClient();
    const start = Date.now();
    await redis.ping();
    const responseTime = Date.now() - start;
    health.checks.redis = {
      status: 'healthy',
      responseTime: `${responseTime}ms`
    };
  } catch (error) {
    health.checks.redis = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'degraded';
    logger.error('Redis health check failed:', error);
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Liveness probe (for Kubernetes)
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness probe (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    // Check if critical dependencies are ready
    const pool = getPool();
    await pool.query('SELECT 1');
    
    const redis = getRedisClient();
    await redis.ping();
    
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

module.exports = router;
