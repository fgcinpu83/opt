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
