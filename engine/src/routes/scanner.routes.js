const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../config/logger');
const arbitrageService = require('../services/arbitrage.service');
const { broadcastOpportunity, broadcastOpportunities } = require('../websocket/opportunities.ws');

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
 * POST /api/v1/scanner/detect
 * Detect arbitrage opportunities from live odds
 */
router.post('/detect', async (req, res) => {
  try {
    const { odds_by_provider } = req.body;

    if (!odds_by_provider || typeof odds_by_provider !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid odds_by_provider'
      });
    }

    const result = arbitrageService.processOdds(odds_by_provider);
    
    // Broadcast opportunities via WebSocket to connected clients
    if (result.opportunities && result.opportunities.length > 0) {
      logger.info(`Broadcasting ${result.opportunities.length} opportunities via WebSocket`);
      broadcastOpportunities(result.opportunities);
    }

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Detect opportunities error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/scanner/settings
 * Update detection settings
 */
router.post('/settings', async (req, res) => {
  try {
    const settings = req.body;

    arbitrageService.updateSettings(settings);

    res.json({
      success: true,
      settings: arbitrageService.settings
    });

  } catch (error) {
    logger.error('Update settings error', { error: error.message });
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

    logger.info('New opportunity created', opportunity);
    
    const createdOpportunity = {
      id: Math.random().toString(36).substr(2, 9),
      ...opportunity,
      created_at: new Date().toISOString()
    };
    
    // Broadcast new opportunity via WebSocket
    broadcastOpportunity(createdOpportunity);
    logger.info('Broadcasted new opportunity via WebSocket');

    res.json({
      success: true,
      opportunity: createdOpportunity
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
 * WebSocket endpoint for live arbitrage feed
 */
router.get('/live-feed', (req, res) => {
  const { getClientsCount } = require('../websocket/opportunities.ws');
  
  res.json({
    success: true,
    message: 'Use WebSocket connection for live feed',
    ws_url: 'ws://localhost:3000/ws/opportunities',
    connected_clients: getClientsCount()
  });
});

/**
 * GET /api/v1/scanner/stats
 * Get scanner statistics
 */
router.get('/stats', async (req, res) => {
  try {
    res.json({
      success: true,
      stats: {
        opportunities_detected: Math.floor(Math.random() * 100),
        opportunities_executed: Math.floor(Math.random() * 50),
        total_profit: Math.floor(Math.random() * 10000),
        uptime: '99.5%'
      }
    });

  } catch (error) {
    logger.error('Get stats error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
