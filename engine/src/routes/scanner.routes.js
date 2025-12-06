// routes/scanner.routes.js - Live arbitrage scanner feed

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../config/logger');

/**
 * GET /api/v1/scanner/opportunities
 * Get active arbitrage opportunities
 */
router.get('/opportunities', async (req, res) => {
  try {
    const { status = 'detected', limit = 50 } = req.query;

    const query = `
      SELECT * FROM v_active_opportunities
      WHERE status = ANY($1::text[])
      ORDER BY tier_priority DESC, profit_percentage DESC, created_at ASC
      LIMIT $2
    `;

    const statusArray = Array.isArray(status) ? status : [status];
    const result = await db.query(query, [statusArray, limit]);

    res.json({
      success: true,
      opportunities: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    logger.error('Get opportunities error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/scanner/opportunities
 * Create new arbitrage opportunity (from scanner)
 */
router.post('/opportunities', async (req, res) => {
  try {
    const opportunity = req.body;

    // Validate required fields
    const required = ['match_name', 'league', 'market_type', 
                     'side_a_sportsbook', 'side_a_odds', 'side_a_selection',
                     'side_b_sportsbook', 'side_b_odds', 'side_b_selection'];
    
    const missing = required.filter(field => !opportunity[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing fields: ${missing.join(', ')}`
      });
    }

    const query = `
      INSERT INTO arbitrage_opportunities (
        match_id, match_name, league, tier, market_type, match_status, match_minute,
        side_a_sportsbook, side_a_selection, side_a_odds, side_a_odds_format, side_a_handicap, side_a_stake,
        side_b_sportsbook, side_b_selection, side_b_odds, side_b_odds_format, side_b_handicap, side_b_stake,
        profit_percentage, expected_profit, total_stake, status, raw_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *
    `;

    const values = [
      opportunity.match_id || null,
      opportunity.match_name,
      opportunity.league,
      opportunity.tier || 'tier3',
      opportunity.market_type,
      opportunity.match_status || 'prematch',
      opportunity.match_minute || 0,
      opportunity.side_a_sportsbook,
      opportunity.side_a_selection,
      opportunity.side_a_odds,
      opportunity.side_a_odds_format || 'decimal',
      opportunity.side_a_handicap || null,
      opportunity.side_a_stake || 0,
      opportunity.side_b_sportsbook,
      opportunity.side_b_selection,
      opportunity.side_b_odds,
      opportunity.side_b_odds_format || 'decimal',
      opportunity.side_b_handicap || null,
      opportunity.side_b_stake || 0,
      opportunity.profit_percentage || 0,
      opportunity.expected_profit || 0,
      opportunity.total_stake || 0,
      'detected',
      JSON.stringify(opportunity.raw_data || {})
    ];

    const result = await db.query(query, values);

    logger.info('Opportunity created', { 
      opportunity_id: result.rows[0].opportunity_id,
      match: opportunity.match_name,
      profit: opportunity.profit_percentage
    });

    res.status(201).json({
      success: true,
      opportunity: result.rows[0]
    });

  } catch (error) {
    logger.error('Create opportunity error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/scanner/live-feed
 * SSE endpoint for real-time scanner updates
 */
router.get('/live-feed', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  // TODO: Implement real-time updates from Redis pub/sub
  // For now, send periodic updates

  const intervalId = setInterval(async () => {
    try {
      const result = await db.query(`
        SELECT * FROM v_active_opportunities
        WHERE status = 'detected'
        ORDER BY created_at DESC
        LIMIT 10
      `);

      res.write(`data: ${JSON.stringify({
        type: 'opportunities',
        data: result.rows,
        timestamp: Date.now()
      })}\n\n`);
    } catch (error) {
      logger.error('Live feed error', { error: error.message });
    }
  }, 5000);

  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

/**
 * GET /api/v1/scanner/stats
 * Get scanner statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'detected') as detected_count,
        COUNT(*) FILTER (WHERE status = 'executing') as executing_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_count,
        AVG(profit_percentage) FILTER (WHERE status = 'completed') as avg_profit,
        MAX(profit_percentage) as max_profit
      FROM arbitrage_opportunities
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;

    const result = await db.query(statsQuery);

    res.json({
      success: true,
      stats: result.rows[0]
    });

  } catch (error) {
    logger.error('Get scanner stats error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
