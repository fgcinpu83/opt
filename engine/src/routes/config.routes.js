// routes/config.routes.js - Configuration management routes

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../config/logger');

/**
 * GET /api/v1/config
 * Get all configurations for user
 */
router.get('/', async (req, res) => {
  try {
    const { user_id = 1 } = req.query;

    // Get tier configurations
    const tiersQuery = `
      SELECT * FROM tier_config
      WHERE user_id = $1 AND is_active = true
      ORDER BY priority DESC
    `;
    const tiersResult = await db.query(tiersQuery, [user_id]);

    // Get profit configuration
    const profitQuery = `
      SELECT * FROM profit_config
      WHERE user_id = $1 AND is_active = true
      LIMIT 1
    `;
    const profitResult = await db.query(profitQuery, [user_id]);

    res.json({
      success: true,
      config: {
        tiers: tiersResult.rows,
        profit: profitResult.rows[0] || null
      }
    });

  } catch (error) {
    logger.error('Get config error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/config/tiers
 * Update tier configurations
 */
router.post('/tiers', async (req, res) => {
  try {
    const { user_id = 1, tiers } = req.body;

    if (!Array.isArray(tiers)) {
      return res.status(400).json({
        success: false,
        error: 'Tiers must be an array'
      });
    }

    // Update each tier
    for (const tier of tiers) {
      const query = `
        INSERT INTO tier_config (user_id, tier_name, tier_label, bet_amount, priority, leagues, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, tier_name)
        DO UPDATE SET
          tier_label = EXCLUDED.tier_label,
          bet_amount = EXCLUDED.bet_amount,
          priority = EXCLUDED.priority,
          leagues = EXCLUDED.leagues,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `;

      await db.query(query, [
        user_id,
        tier.tier_name,
        tier.tier_label,
        tier.bet_amount,
        tier.priority,
        tier.leagues || [],
        tier.is_active !== false
      ]);
    }

    logger.info('Tier configurations updated', { user_id, count: tiers.length });

    res.json({
      success: true,
      message: 'Tier configurations updated successfully',
      count: tiers.length
    });

  } catch (error) {
    logger.error('Update tiers error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/config/profit
 * Update profit settings
 */
router.post('/profit', async (req, res) => {
  try {
    const { user_id = 1, min_profit_percentage, max_profit_percentage,
            max_minute_ht, max_minute_ft, match_filter, enabled_markets } = req.body;

    const query = `
      INSERT INTO profit_config (
        user_id, min_profit_percentage, max_profit_percentage,
        max_minute_ht, max_minute_ft, match_filter, enabled_markets, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      ON CONFLICT (user_id)
      DO UPDATE SET
        min_profit_percentage = COALESCE(EXCLUDED.min_profit_percentage, profit_config.min_profit_percentage),
        max_profit_percentage = COALESCE(EXCLUDED.max_profit_percentage, profit_config.max_profit_percentage),
        max_minute_ht = COALESCE(EXCLUDED.max_minute_ht, profit_config.max_minute_ht),
        max_minute_ft = COALESCE(EXCLUDED.max_minute_ft, profit_config.max_minute_ft),
        match_filter = COALESCE(EXCLUDED.match_filter, profit_config.match_filter),
        enabled_markets = COALESCE(EXCLUDED.enabled_markets, profit_config.enabled_markets),
        updated_at = NOW()
      WHERE profit_config.user_id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      user_id,
      min_profit_percentage,
      max_profit_percentage,
      max_minute_ht,
      max_minute_ft,
      match_filter,
      enabled_markets ? JSON.stringify(enabled_markets) : null
    ]);

    logger.info('Profit configuration updated', { user_id, config: result.rows[0] });

    res.json({
      success: true,
      message: 'Profit configuration updated successfully',
      config: result.rows[0]
    });

  } catch (error) {
    logger.error('Update profit config error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/config/system
 * Get system-wide configuration
 */
router.get('/system', async (req, res) => {
  try {
    const { user_id = 1 } = req.query;

    const query = `
      SELECT config_key, config_value
      FROM system_config
      WHERE user_id = $1
    `;

    const result = await db.query(query, [user_id]);

    const config = {};
    result.rows.forEach(row => {
      config[row.config_key] = row.config_value;
    });

    res.json({
      success: true,
      config
    });

  } catch (error) {
    logger.error('Get system config error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/config/system
 * Set system configuration value
 */
router.post('/system', async (req, res) => {
  try {
    const { user_id = 1, config_key, config_value } = req.body;

    if (!config_key || config_value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'config_key and config_value are required'
      });
    }

    const query = `
      INSERT INTO system_config (user_id, config_key, config_value)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, config_key)
      DO UPDATE SET
        config_value = EXCLUDED.config_value,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await db.query(query, [
      user_id,
      config_key,
      JSON.stringify(config_value)
    ]);

    res.json({
      success: true,
      message: 'System configuration updated',
      config: result.rows[0]
    });

  } catch (error) {
    logger.error('Set system config error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
