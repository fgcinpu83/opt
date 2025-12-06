// routes/system.routes.js - System health and status

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const redis = require('../config/redis');
const logger = require('../config/logger');

/**
 * GET /api/v1/system/health
 * Get system health status for dashboard LED indicators
 */
router.get('/health', async (req, res) => {
  const health = {
    timestamp: new Date().toISOString(),
    services: {
      api: { status: 'healthy', message: 'API is running' },
      database: { status: 'unknown', message: '' },
      redis: { status: 'unknown', message: '' },
      workers: { status: 'unknown', message: '', count: 0 }
    },
    overall: 'healthy'
  };

  // Check Database
  try {
    const dbStart = Date.now();
    await db.query('SELECT 1');
    const dbLatency = Date.now() - dbStart;
    
    health.services.database = {
      status: 'healthy',
      message: 'PostgreSQL connected',
      latency_ms: dbLatency
    };
  } catch (error) {
    health.services.database = {
      status: 'unhealthy',
      message: `Database error: ${error.message}`
    };
    health.overall = 'degraded';
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    await redis.ping();
    const redisLatency = Date.now() - redisStart;
    
    health.services.redis = {
      status: 'healthy',
      message: 'Redis connected',
      latency_ms: redisLatency
    };
  } catch (error) {
    health.services.redis = {
      status: 'unhealthy',
      message: `Redis error: ${error.message}`
    };
    health.overall = 'degraded';
  }

  // Check Workers/Browsers
  try {
    const workerQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM worker_status
      WHERE last_heartbeat >= NOW() - INTERVAL '60 seconds'
      GROUP BY status
    `;
    
    const workerResult = await db.query(workerQuery);
    
    const workerStats = {
      standby: 0,
      processing: 0,
      error: 0,
      crashed: 0
    };

    workerResult.rows.forEach(row => {
      workerStats[row.status] = parseInt(row.count);
    });

    const totalWorkers = Object.values(workerStats).reduce((a, b) => a + b, 0);

    let workerStatus = 'unhealthy';
    let workerMessage = 'No workers available';

    if (workerStats.processing > 0) {
      workerStatus = 'processing';
      workerMessage = `${workerStats.processing} worker(s) processing`;
    } else if (workerStats.standby > 0) {
      workerStatus = 'healthy';
      workerMessage = `${workerStats.standby} worker(s) standby`;
    } else if (totalWorkers > 0 && workerStats.error > 0) {
      workerStatus = 'error';
      workerMessage = `${workerStats.error} worker(s) in error state`;
    }

    health.services.workers = {
      status: workerStatus,
      message: workerMessage,
      count: totalWorkers,
      breakdown: workerStats
    };

    if (totalWorkers === 0) {
      health.overall = 'degraded';
    }

  } catch (error) {
    health.services.workers = {
      status: 'error',
      message: `Worker check error: ${error.message}`,
      count: 0
    };
  }

  // Determine overall status
  const statuses = Object.values(health.services).map(s => s.status);
  if (statuses.includes('unhealthy')) {
    health.overall = 'unhealthy';
  } else if (statuses.includes('error') || statuses.includes('processing')) {
    health.overall = 'degraded';
  }

  res.json({
    success: true,
    health
  });
});

/**
 * GET /api/v1/system/stats
 * Get system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {};

    // Get database stats
    const dbStatsQuery = `
      SELECT
        (SELECT COUNT(*) FROM sportsbook_accounts WHERE status = 'online') as online_accounts,
        (SELECT COUNT(*) FROM arbitrage_opportunities WHERE status = 'detected') as pending_opportunities,
        (SELECT COUNT(*) FROM arbitrage_opportunities WHERE status = 'executing') as executing_opportunities,
        (SELECT COUNT(*) FROM bet_history WHERE bet_status IN ('pending', 'accepted', 'running')) as active_bets,
        (SELECT COUNT(*) FROM bet_history WHERE DATE(created_at) = CURRENT_DATE) as today_bets
    `;

    const dbStatsResult = await db.query(dbStatsQuery);
    stats.database = dbStatsResult.rows[0];

    // Get Redis stats
    try {
      const redisInfo = await redis.info('stats');
      stats.redis = {
        connected: true,
        info: redisInfo
      };
    } catch (error) {
      stats.redis = { connected: false, error: error.message };
    }

    // Get worker stats
    const workerStatsQuery = `
      SELECT
        worker_type,
        status,
        COUNT(*) as count
      FROM worker_status
      WHERE last_heartbeat >= NOW() - INTERVAL '60 seconds'
      GROUP BY worker_type, status
    `;

    const workerStatsResult = await db.query(workerStatsQuery);
    stats.workers = workerStatsResult.rows;

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Get system stats error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/system/worker/heartbeat
 * Worker heartbeat endpoint
 */
router.post('/worker/heartbeat', async (req, res) => {
  try {
    const { worker_id, worker_type, status, current_task, metadata } = req.body;

    if (!worker_id) {
      return res.status(400).json({
        success: false,
        error: 'worker_id is required'
      });
    }

    const query = `
      INSERT INTO worker_status (worker_id, worker_type, status, last_heartbeat, current_task, metadata)
      VALUES ($1, $2, $3, NOW(), $4, $5)
      ON CONFLICT (worker_id)
      DO UPDATE SET
        worker_type = COALESCE(EXCLUDED.worker_type, worker_status.worker_type),
        status = COALESCE(EXCLUDED.status, worker_status.status),
        last_heartbeat = NOW(),
        current_task = COALESCE(EXCLUDED.current_task, worker_status.current_task),
        metadata = COALESCE(EXCLUDED.metadata, worker_status.metadata),
        updated_at = NOW()
      RETURNING *
    `;

    const result = await db.query(query, [
      worker_id,
      worker_type || 'browser',
      status || 'standby',
      current_task ? JSON.stringify(current_task) : null,
      metadata ? JSON.stringify(metadata) : null
    ]);

    res.json({
      success: true,
      worker: result.rows[0]
    });

  } catch (error) {
    logger.error('Worker heartbeat error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/system/auto-status
 * Get Auto Robot status (on/off)
 */
router.get('/auto-status', async (req, res) => {
  try {
    const { user_id = 1 } = req.query;

    const query = `
      SELECT config_value FROM system_config
      WHERE user_id = $1 AND config_key = 'auto_robot_enabled'
    `;

    const result = await db.query(query, [user_id]);

    const enabled = result.rows.length > 0 
      ? result.rows[0].config_value 
      : false;

    res.json({
      success: true,
      auto_enabled: enabled
    });

  } catch (error) {
    logger.error('Get auto status error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/system/auto-toggle
 * Toggle Auto Robot on/off
 */
router.post('/auto-toggle', async (req, res) => {
  try {
    const { user_id = 1, enabled } = req.body;

    const query = `
      INSERT INTO system_config (user_id, config_key, config_value)
      VALUES ($1, 'auto_robot_enabled', $2)
      ON CONFLICT (user_id, config_key)
      DO UPDATE SET
        config_value = EXCLUDED.config_value,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await db.query(query, [user_id, JSON.stringify(enabled)]);

    logger.info('Auto robot toggled', { user_id, enabled });

    // Log to system logs
    await db.query(
      `INSERT INTO system_logs (log_level, log_type, message, details, user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      ['info', 'system', `Auto robot ${enabled ? 'enabled' : 'disabled'}`, JSON.stringify({ enabled }), user_id]
    );

    res.json({
      success: true,
      message: `Auto robot ${enabled ? 'enabled' : 'disabled'}`,
      config: result.rows[0]
    });

  } catch (error) {
    logger.error('Toggle auto error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
