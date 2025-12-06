// routes/history.routes.js - Bet history and execution logs

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../config/logger');

/**
 * GET /api/v1/history/bets
 * Get bet history with filters
 */
router.get('/bets', async (req, res) => {
  try {
    const { 
      status, 
      sportsbook, 
      date_from,
      date_to,
      limit = 100,
      offset = 0 
    } = req.query;

    let query = `
      SELECT bh.*, ao.match_name as match, ao.league
      FROM bet_history bh
      LEFT JOIN arbitrage_opportunities ao ON bh.opportunity_id = ao.opportunity_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND bh.bet_status = $${paramCount++}`;
      params.push(status);
    }

    if (sportsbook) {
      query += ` AND bh.sportsbook = $${paramCount++}`;
      params.push(sportsbook);
    }

    if (date_from) {
      query += ` AND bh.created_at >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND bh.created_at <= $${paramCount++}`;
      params.push(date_to);
    }

    query += ` ORDER BY bh.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    const countResult = await db.query('SELECT COUNT(*) FROM bet_history WHERE created_at >= $1', [date_from || '1970-01-01']);

    res.json({
      success: true,
      bets: result.rows,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    logger.error('Get bet history error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/history/bets/today
 * Get today's bets
 */
router.get('/bets/today', async (req, res) => {
  try {
    const query = 'SELECT * FROM v_today_bets';
    const result = await db.query(query);

    res.json({
      success: true,
      bets: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    logger.error('Get today bets error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/history/bets/pending
 * Get pending/running bets
 */
router.get('/bets/pending', async (req, res) => {
  try {
    const query = 'SELECT * FROM v_pending_bets';
    const result = await db.query(query);

    res.json({
      success: true,
      bets: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    logger.error('Get pending bets error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/history/logs
 * Get system logs
 */
router.get('/logs', async (req, res) => {
  try {
    const { 
      log_level, 
      log_type,
      limit = 100,
      offset = 0
    } = req.query;

    let query = `
      SELECT *
      FROM system_logs
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (log_level) {
      query += ` AND log_level = $${paramCount++}`;
      params.push(log_level);
    }

    if (log_type) {
      query += ` AND log_type = $${paramCount++}`;
      params.push(log_type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      success: true,
      logs: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    logger.error('Get logs error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/history/summary
 * Get daily summary
 */
router.get('/summary', async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0], user_id = 1 } = req.query;

    const query = `
      SELECT *
      FROM daily_summary
      WHERE summary_date = $1 AND user_id = $2
    `;

    const result = await db.query(query, [date, user_id]);

    if (result.rows.length === 0) {
      // Generate summary for the day
      return res.json({
        success: true,
        summary: {
          summary_date: date,
          total_opportunities_detected: 0,
          total_opportunities_executed: 0,
          total_bets_placed: 0,
          gross_profit: 0,
          net_profit: 0
        }
      });
    }

    res.json({
      success: true,
      summary: result.rows[0]
    });

  } catch (error) {
    logger.error('Get summary error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/history/profit
 * Get profit statistics
 */
router.get('/profit', async (req, res) => {
  try {
    const { period = '7d', user_id = 1 } = req.query;

    let interval = '7 days';
    if (period === '1d') interval = '1 day';
    else if (period === '30d') interval = '30 days';
    else if (period === '90d') interval = '90 days';

    const query = `
      SELECT
        COALESCE(SUM(net_profit), 0) as total_profit,
        COALESCE(AVG(roi_percentage), 0) as avg_roi,
        COALESCE(SUM(total_bets_placed), 0) as total_bets,
        COALESCE(SUM(total_bets_won), 0) as total_wins,
        COALESCE(SUM(total_opportunities_executed), 0) as total_executed
      FROM daily_summary
      WHERE user_id = $1
        AND summary_date >= CURRENT_DATE - INTERVAL '${interval}'
    `;

    const result = await db.query(query, [user_id]);

    res.json({
      success: true,
      profit: result.rows[0],
      period
    });

  } catch (error) {
    logger.error('Get profit stats error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
