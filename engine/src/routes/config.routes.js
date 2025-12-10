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
 * Update profit settings (FAILSAFE version)
 */
router.post('/profit', async (req, res) => {
  try {
    // ===== FAILSAFE: Debug log =====
    console.log("RECEIVED PROFIT CONFIG PAYLOAD:", req.body);
    
    // ===== FAILSAFE: Accept multiple field name variations =====
    const user_id = req.body.user_id || 1;
    const min_profit_percentage = req.body.min_profit_percentage || req.body.minProfitPercentage || 
                                   req.body.min_percentage || req.body.minPercentage || req.body.minProfit || 0;
    const max_profit_percentage = req.body.max_profit_percentage || req.body.maxProfitPercentage || 
                                   req.body.max_percentage || req.body.maxPercentage || req.body.maxProfit || 10;
    const max_minute_ht = req.body.max_minute_ht || req.body.maxMinuteHt || req.body.maxMinuteHT || 
                          req.body.ht_time_last_bet || req.body.htTimeLastBet || req.body.minute_limit_ht || 35;
    const max_minute_ft = req.body.max_minute_ft || req.body.maxMinuteFt || req.body.maxMinuteFT || 
                          req.body.ft_time_last_bet || req.body.ftTimeLastBet || req.body.minute_limit_ft || 75;
    const match_filter = req.body.match_filter || req.body.matchFilter || 'all';
    const enabled_markets = req.body.enabled_markets || req.body.enabledMarkets || req.body.markets;

    console.log("MAPPED PROFIT VALUES:", {
      user_id,
      min_profit_percentage,
      max_profit_percentage,
      max_minute_ht,
      max_minute_ft,
      match_filter,
      enabled_markets
    });

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
    console.log("✅ Profit config saved:", result.rows[0]);

    res.json({
      success: true,
      message: 'Profit configuration updated successfully',
      config: result.rows[0]
    });

  } catch (error) {
    logger.error('Update profit config error', { error: error.message, stack: error.stack });
    console.error('❌ Update profit config error:', error);
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
 * Set system configuration value (FAILSAFE version)
 */
router.post('/system', async (req, res) => {
  try {
    // ===== FAILSAFE: Debug log to see what frontend sends =====
    console.log("RECEIVED CONFIG PAYLOAD:", req.body);
    
    // ===== FAILSAFE: Remove strict validation - accept any format =====
    const user_id = req.body.user_id || 1;
    
    // Handle both single config_key/config_value format AND bulk config object
    if (req.body.config_key && req.body.config_value !== undefined) {
      // Single key-value format
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
        req.body.config_key,
        JSON.stringify(req.body.config_value)
      ]);

      console.log("✅ Single config saved:", result.rows[0]);

      res.json({
        success: true,
        message: 'System configuration updated',
        config: result.rows[0]
      });
    } else {
      // ===== FAILSAFE: Bulk config update - accept all possible field name variations =====
      const configMapping = {
        'min_profit': req.body.min_profit || req.body.min_percentage || req.body.minPercentage || req.body.minProfit,
        'max_profit': req.body.max_profit || req.body.max_percentage || req.body.maxPercentage || req.body.maxProfit,
        'min_odds': req.body.min_odds || req.body.minOdds,
        'max_odds': req.body.max_odds || req.body.maxOdds,
        'max_stake': req.body.max_stake || req.body.maxStake,
        'scan_interval': req.body.scan_interval || req.body.scanInterval,
        'ht_time_last_bet': req.body.ht_time_last_bet || req.body.htTimeLastBet || req.body.minute_limit_ht || req.body.maxMinuteHT,
        'ft_time_last_bet': req.body.ft_time_last_bet || req.body.ftTimeLastBet || req.body.minute_limit_ft || req.body.maxMinuteFT,
        'match_filter': req.body.match_filter || req.body.matchFilter,
        // Market filters
        'ft_hdp': req.body.ft_hdp ?? req.body.ftHdp ?? req.body.markets?.ftHdp,
        'ft_ou': req.body.ft_ou ?? req.body.ftOu ?? req.body.markets?.ftOu,
        'ft_1x2': req.body.ft_1x2 ?? req.body.ft1x2 ?? req.body.markets?.ft1x2,
        'ht_hdp': req.body.ht_hdp ?? req.body.htHdp ?? req.body.markets?.htHdp,
        'ht_ou': req.body.ht_ou ?? req.body.htOu ?? req.body.markets?.htOu,
        'ht_1x2': req.body.ht_1x2 ?? req.body.ht1x2 ?? req.body.markets?.ht1x2,
      };

      console.log("MAPPED CONFIG VALUES:", configMapping);

      // Insert/Update all config values
      const savedConfigs = [];
      for (const [key, value] of Object.entries(configMapping)) {
        if (value !== undefined && value !== null) {
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
            key,
            JSON.stringify(value)
          ]);
          
          savedConfigs.push(result.rows[0]);
        }
      }

      logger.info('Bulk system configuration updated', { user_id, count: savedConfigs.length });
      console.log("✅ Bulk configs saved:", savedConfigs.length, "items");

      res.json({
        success: true,
        message: 'System configuration updated successfully',
        count: savedConfigs.length,
        configs: savedConfigs
      });
    }

  } catch (error) {
    logger.error('Set system config error', { error: error.message, stack: error.stack });
    console.error('❌ Set system config error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
