// routes/sessions.routes.js - Sportsbook account session management

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../config/logger');

/**
 * POST /api/v1/sessions/login
 * Login to sportsbook and establish session
 */
router.post('/login', async (req, res) => {
  try {
    const { sportsbook, url, username, password, user_id = 1 } = req.body;

    // Validate input
    if (!sportsbook || !url || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sportsbook, url, username, password'
      });
    }

    // TODO: Encrypt password before storing
    // For now, store as-is (INSECURE - fix in production)
    
    // Check if account already exists
    const checkQuery = `
      SELECT id FROM sportsbook_accounts
      WHERE user_id = $1 AND sportsbook = $2 AND username = $3
    `;
    const existing = await db.query(checkQuery, [user_id, sportsbook, username]);

    let accountId;

    if (existing.rows.length > 0) {
      // Update existing account
      accountId = existing.rows[0].id;
      const updateQuery = `
        UPDATE sportsbook_accounts
        SET url = $1, password_encrypted = $2, status = 'offline', updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      await db.query(updateQuery, [url, password, accountId]);
    } else {
      // Insert new account
      const insertQuery = `
        INSERT INTO sportsbook_accounts (user_id, sportsbook, url, username, password_encrypted, status)
        VALUES ($1, $2, $3, $4, $5, 'offline')
        RETURNING *
      `;
      const result = await db.query(insertQuery, [user_id, sportsbook, url, username, password]);
      accountId = result.rows[0].id;
    }

    // TODO: Send login job to worker to establish session
    logger.info('Account registered/updated', { sportsbook, username, accountId });

    // Log to system logs
    await db.query(
      `INSERT INTO system_logs (log_level, log_type, message, details, user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      ['info', 'auth', `Account login initiated for ${sportsbook}`, JSON.stringify({ sportsbook, username }), user_id]
    );

    res.json({
      success: true,
      message: 'Account saved. Login will be initiated.',
      account_id: accountId,
      sportsbook,
      username,
      status: 'offline'
    });

  } catch (error) {
    logger.error('Session login error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/sessions
 * Get all sportsbook accounts for user
 */
router.get('/', async (req, res) => {
  try {
    const { user_id = 1 } = req.query;

    const query = `
      SELECT id, sportsbook, url, username, status, balance,
             balance_updated_at, last_checked, created_at
      FROM sportsbook_accounts
      WHERE user_id = $1
      ORDER BY sportsbook, created_at DESC
    `;

    const result = await db.query(query, [user_id]);

    res.json({
      success: true,
      accounts: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    logger.error('Get sessions error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/sessions/:id/refresh
 * Refresh balance for specific account
 */
router.post('/:id/refresh', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Send refresh balance job to worker

    logger.info('Balance refresh requested', { account_id: id });

    res.json({
      success: true,
      message: 'Balance refresh initiated',
      account_id: id
    });

  } catch (error) {
    logger.error('Refresh balance error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/v1/sessions/:id
 * Delete sportsbook account
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM sportsbook_accounts WHERE id = $1 RETURNING sportsbook, username';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    logger.info('Account deleted', { account_id: id, account: result.rows[0] });

    res.json({
      success: true,
      message: 'Account deleted successfully',
      account: result.rows[0]
    });

  } catch (error) {
    logger.error('Delete account error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
