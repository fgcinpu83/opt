// src/server.js - Express server setup
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./config/logger');
const { register: metricsRegister } = require('./utils/metrics');

// Routes
const healthRoutes = require('./routes/health.routes');
const jobRoutes = require('./routes/job.routes');
const workerRoutes = require('./routes/worker.routes');
const sessionsRoutes = require('./routes/sessions.routes');
const configRoutes = require('./routes/config.routes');
const scannerRoutes = require('./routes/scanner.routes');
const historyRoutes = require('./routes/history.routes');
const systemRoutes = require('./routes/system.routes');

async function createServer() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    next();
  });

  // Routes
  app.use('/health', healthRoutes);
  app.use('/api/v1/jobs', jobRoutes);
  app.use('/api/v1/workers', workerRoutes);
  app.use('/api/v1/sessions', sessionsRoutes);
  app.use('/api/v1/config', configRoutes);
  app.use('/api/v1/scanner', scannerRoutes);
  app.use('/api/v1/history', historyRoutes);
  app.use('/api/v1/system', systemRoutes);

  // Prometheus metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', metricsRegister.contentType);
      res.end(await metricsRegister.metrics());
    } catch (error) {
      res.status(500).end(error.message);
    }
  });

  // API documentation (basic)
  app.get('/api/docs', (req, res) => {
    res.json({
      name: 'Arbitrage Bot Engine API',
      version: '1.0.0',
      endpoints: {
        health: {
          'GET /health': 'System health check',
          'GET /health/detailed': 'Detailed health check'
        },
        sessions: {
          'POST /api/v1/sessions/login': 'Login to sportsbook',
          'GET /api/v1/sessions': 'List sportsbook accounts',
          'POST /api/v1/sessions/:id/refresh': 'Refresh account balance',
          'DELETE /api/v1/sessions/:id': 'Delete account'
        },
        config: {
          'GET /api/v1/config': 'Get all configurations',
          'POST /api/v1/config/tiers': 'Update tier configurations',
          'POST /api/v1/config/profit': 'Update profit settings',
          'GET /api/v1/config/system': 'Get system config',
          'POST /api/v1/config/system': 'Set system config'
        },
        scanner: {
          'GET /api/v1/scanner/opportunities': 'Get active opportunities',
          'POST /api/v1/scanner/opportunities': 'Create opportunity',
          'GET /api/v1/scanner/live-feed': 'SSE live feed',
          'GET /api/v1/scanner/stats': 'Scanner statistics'
        },
        history: {
          'GET /api/v1/history/bets': 'Get bet history',
          'GET /api/v1/history/bets/today': 'Today bets',
          'GET /api/v1/history/bets/pending': 'Pending bets',
          'GET /api/v1/history/logs': 'System logs',
          'GET /api/v1/history/summary': 'Daily summary',
          'GET /api/v1/history/profit': 'Profit statistics'
        },
        system: {
          'GET /api/v1/system/health': 'System health status',
          'GET /api/v1/system/stats': 'System statistics',
          'POST /api/v1/system/worker/heartbeat': 'Worker heartbeat',
          'GET /api/v1/system/auto-status': 'Get auto robot status',
          'POST /api/v1/system/auto-toggle': 'Toggle auto robot'
        },
        jobs: {
          'POST /api/v1/jobs': 'Submit new job',
          'GET /api/v1/jobs/:id': 'Get job status',
          'GET /api/v1/jobs': 'List jobs',
          'DELETE /api/v1/jobs/:id': 'Cancel job'
        },
        workers: {
          'POST /api/v1/workers/register': 'Register worker',
          'POST /api/v1/workers/:id/heartbeat': 'Worker heartbeat',
          'GET /api/v1/workers': 'List workers',
          'GET /api/v1/workers/:id': 'Get worker details'
        },
        metrics: {
          'GET /metrics': 'Prometheus metrics'
        }
      }
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`
    });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
      error: err.name || 'Error',
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  return app;
}

module.exports = { createServer };
