// services/execution.service.js - Sure-bet execution with sequential logic

const logger = require('../config/logger');
const db = require('../config/database');

/**
 * Bet execution service
 * Implements sequential sure-bet logic:
 * 1. Place value bet first (higher odds)
 * 2. Wait for acceptance/running status
 * 3. Place hedge bet
 * 4. If step 1 rejected, cancel step 2
 */
class ExecutionService {
  /**
   * Execute arbitrage opportunity with sequential logic
   * 
   * @param {Object} opportunity - Analyzed opportunity
   * @param {Object} accounts - Sportsbook account credentials
   * @returns {Object} Execution result
   */
  static async executeArbitrage(opportunity, accounts) {
    const execution = {
      opportunity_id: opportunity.opportunity_id,
      status: 'pending',
      bets: [],
      errors: [],
      started_at: new Date(),
      completed_at: null
    };

    try {
      logger.info('Starting arbitrage execution', {
        opportunity_id: opportunity.opportunity_id,
        match: opportunity.match_name,
        profit: opportunity.profit_percentage
      });

      // Update opportunity status to 'executing'
      await this._updateOpportunityStatus(opportunity.opportunity_id, 'executing');

      // STEP 1: Identify value bet (higher odds = place first)
      const valueBetSide = opportunity.value_bet_side;
      const hedgeBetSide = opportunity.hedge_bet_side;

      const valueBet = this._prepareBet(opportunity, valueBetSide, accounts);
      const hedgeBet = this._prepareBet(opportunity, hedgeBetSide, accounts);

      logger.info('Execution order determined', {
        first: valueBetSide,
        second: hedgeBetSide
      });

      // STEP 2: Place value bet first
      logger.info('Placing value bet', { side: valueBetSide, stake: valueBet.stake });
      
      const valueBetResult = await this._placeBet(valueBet);
      execution.bets.push(valueBetResult);

      // Check if value bet was accepted or is running
      if (valueBetResult.status === 'rejected') {
        // Value bet rejected - ABORT hedge bet
        logger.warn('Value bet rejected - aborting hedge bet', {
          opportunity_id: opportunity.opportunity_id,
          reason: valueBetResult.error_message
        });

        execution.status = 'failed';
        execution.errors.push('Value bet rejected - hedge bet cancelled');
        execution.completed_at = new Date();

        await this._updateOpportunityStatus(opportunity.opportunity_id, 'failed');
        return execution;
      }

      // STEP 3: Value bet accepted or running - proceed with hedge bet
      logger.info('Value bet accepted/running - placing hedge bet', {
        value_bet_status: valueBetResult.status,
        value_bet_ticket: valueBetResult.ticket_id
      });

      // Wait a brief moment to ensure value bet is confirmed
      await this._sleep(500); // 500ms delay

      // Place hedge bet
      const hedgeBetResult = await this._placeBet(hedgeBet);
      execution.bets.push(hedgeBetResult);

      // Determine final execution status
      if (valueBetResult.status !== 'rejected' && hedgeBetResult.status !== 'rejected') {
        execution.status = 'success';
        logger.info('Arbitrage execution successful', {
          opportunity_id: opportunity.opportunity_id,
          value_bet: valueBetResult.ticket_id,
          hedge_bet: hedgeBetResult.ticket_id
        });

        await this._updateOpportunityStatus(opportunity.opportunity_id, 'completed');
      } else {
        execution.status = 'partial';
        execution.errors.push('One or more bets failed');
        logger.warn('Partial arbitrage execution', {
          opportunity_id: opportunity.opportunity_id,
          bets: execution.bets.map(b => ({ side: b.bet_side, status: b.status }))
        });

        await this._updateOpportunityStatus(opportunity.opportunity_id, 'partial');
      }

      execution.completed_at = new Date();

      // Log execution summary
      await this._logExecution(opportunity, execution);

      return execution;

    } catch (error) {
      logger.error('Arbitrage execution error', {
        opportunity_id: opportunity.opportunity_id,
        error: error.message
      });

      execution.status = 'error';
      execution.errors.push(error.message);
      execution.completed_at = new Date();

      await this._updateOpportunityStatus(opportunity.opportunity_id, 'failed');

      return execution;
    }
  }

  /**
   * Prepare bet data from opportunity
   * 
   * @param {Object} opportunity - Opportunity data
   * @param {string} side - 'side_a' or 'side_b'
   * @param {Object} accounts - Account credentials
   * @returns {Object} Bet data ready for execution
   */
  static _prepareBet(opportunity, side, accounts) {
    const prefix = side === 'side_a' ? 'side_a' : 'side_b';
    
    const sportsbook = opportunity[`${prefix}_sportsbook`];
    const account = accounts[sportsbook];

    if (!account) {
      throw new Error(`No account found for sportsbook: ${sportsbook}`);
    }

    return {
      opportunity_id: opportunity.opportunity_id,
      sportsbook,
      account_id: account.id,
      match_name: opportunity.match_name,
      selection: opportunity[`${prefix}_selection`],
      market_type: opportunity.market_type,
      handicap: opportunity[`${prefix}_handicap`],
      odds: opportunity[`${prefix}_odds_decimal`],
      stake: opportunity[`${prefix}_stake`],
      bet_side: side
    };
  }

  /**
   * Place bet via worker/browser automation
   * 
   * @param {Object} betData - Bet data
   * @returns {Object} Bet result with ticket_id and status
   */
  static async _placeBet(betData) {
    const betRecord = {
      bet_id: this._generateBetId(),
      opportunity_id: betData.opportunity_id,
      sportsbook: betData.sportsbook,
      match_name: betData.match_name,
      selection: betData.selection,
      market_type: betData.market_type,
      handicap: betData.handicap,
      odds: betData.odds,
      stake: betData.stake,
      bet_side: betData.bet_side,
      ticket_id: null,
      bet_status: 'pending',
      status_updated_at: new Date(),
      created_at: new Date()
    };

    try {
      // TODO: Send bet placement job to worker queue
      // For now, this is a stub that simulates the process
      
      logger.info('Sending bet to worker', {
        sportsbook: betData.sportsbook,
        stake: betData.stake,
        odds: betData.odds
      });

      // Simulate API call to worker
      const workerResult = await this._sendToWorker({
        type: 'place_bet',
        bet_data: betData
      });

      // Update bet record with worker result
      betRecord.ticket_id = workerResult.ticket_id;
      betRecord.bet_status = workerResult.status; // 'accepted', 'running', 'rejected'
      betRecord.status_updated_at = new Date();
      betRecord.screenshot_path = workerResult.screenshot_path;
      betRecord.execution_time_ms = workerResult.execution_time_ms;
      betRecord.raw_response = workerResult;

      if (workerResult.error) {
        betRecord.error_message = workerResult.error;
      }

      // Save to database
      await this._saveBetHistory(betRecord);

      logger.info('Bet placed', {
        bet_id: betRecord.bet_id,
        status: betRecord.bet_status,
        ticket_id: betRecord.ticket_id
      });

      return betRecord;

    } catch (error) {
      logger.error('Bet placement error', {
        sportsbook: betData.sportsbook,
        error: error.message
      });

      betRecord.bet_status = 'error';
      betRecord.error_message = error.message;
      betRecord.status_updated_at = new Date();

      await this._saveBetHistory(betRecord);

      return betRecord;
    }
  }

  /**
   * Send bet placement request to worker
   * (Stub - actual implementation will use Redis queue + WebSocket)
   * 
   * @param {Object} jobData - Job data for worker
   * @returns {Object} Worker response
   */
  static async _sendToWorker(jobData) {
    // TODO: Implement actual Redis queue + WebSocket communication
    // For now, simulate worker response

    logger.info('[STUB] Sending to worker', { type: jobData.type });

    // Simulate processing delay
    await this._sleep(1000 + Math.random() * 2000);

    // Simulate 90% success rate
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      return {
        success: true,
        ticket_id: `TKT${Date.now()}${Math.floor(Math.random() * 1000)}`,
        status: Math.random() > 0.5 ? 'accepted' : 'running',
        screenshot_path: `/screenshots/${Date.now()}.png`,
        execution_time_ms: 1000 + Math.floor(Math.random() * 2000),
        message: 'Bet placed successfully'
      };
    } else {
      return {
        success: false,
        ticket_id: null,
        status: 'rejected',
        error: 'Bet rejected by bookmaker',
        execution_time_ms: 500
      };
    }
  }

  /**
   * Update opportunity status in database
   * 
   * @param {string} opportunityId - Opportunity ID
   * @param {string} status - New status
   */
  static async _updateOpportunityStatus(opportunityId, status) {
    try {
      const query = `
        UPDATE arbitrage_opportunities
        SET status = $1,
            updated_at = NOW(),
            ${status === 'executing' ? 'execution_started_at = NOW(),' : ''}
            ${status === 'completed' || status === 'failed' ? 'execution_completed_at = NOW(),' : ''}
            execution_completed_at = CASE 
              WHEN $1 IN ('completed', 'failed', 'partial') THEN NOW() 
              ELSE execution_completed_at 
            END
        WHERE opportunity_id = $2
      `;

      await db.query(query, [status, opportunityId]);
    } catch (error) {
      logger.error('Failed to update opportunity status', {
        opportunityId,
        status,
        error: error.message
      });
    }
  }

  /**
   * Save bet to history table
   * 
   * @param {Object} betRecord - Bet record
   */
  static async _saveBetHistory(betRecord) {
    try {
      const query = `
        INSERT INTO bet_history (
          bet_id, opportunity_id, sportsbook, match_name, selection,
          market_type, handicap, odds, stake, bet_side, ticket_id,
          bet_status, status_updated_at, screenshot_path, error_message,
          execution_time_ms, raw_response, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (bet_id) DO UPDATE SET
          bet_status = EXCLUDED.bet_status,
          status_updated_at = EXCLUDED.status_updated_at,
          ticket_id = EXCLUDED.ticket_id,
          screenshot_path = EXCLUDED.screenshot_path,
          error_message = EXCLUDED.error_message,
          execution_time_ms = EXCLUDED.execution_time_ms,
          raw_response = EXCLUDED.raw_response,
          updated_at = NOW()
      `;

      await db.query(query, [
        betRecord.bet_id,
        betRecord.opportunity_id,
        betRecord.sportsbook,
        betRecord.match_name,
        betRecord.selection,
        betRecord.market_type,
        betRecord.handicap,
        betRecord.odds,
        betRecord.stake,
        betRecord.bet_side,
        betRecord.ticket_id,
        betRecord.bet_status,
        betRecord.status_updated_at,
        betRecord.screenshot_path,
        betRecord.error_message,
        betRecord.execution_time_ms,
        JSON.stringify(betRecord.raw_response || {}),
        betRecord.created_at
      ]);

      logger.debug('Bet saved to history', { bet_id: betRecord.bet_id });
    } catch (error) {
      logger.error('Failed to save bet history', {
        bet_id: betRecord.bet_id,
        error: error.message
      });
    }
  }

  /**
   * Log execution to system logs
   * 
   * @param {Object} opportunity - Opportunity
   * @param {Object} execution - Execution result
   */
  static async _logExecution(opportunity, execution) {
    try {
      const query = `
        INSERT INTO system_logs (log_level, log_type, message, details)
        VALUES ($1, $2, $3, $4)
      `;

      await db.query(query, [
        execution.status === 'success' ? 'info' : 'warning',
        'betting',
        `Arbitrage execution ${execution.status}`,
        JSON.stringify({
          opportunity_id: opportunity.opportunity_id,
          match: opportunity.match_name,
          profit: opportunity.profit_percentage,
          bets: execution.bets.length,
          execution
        })
      ]);
    } catch (error) {
      logger.error('Failed to log execution', { error: error.message });
    }
  }

  /**
   * Generate unique bet ID
   * 
   * @returns {string} Bet ID
   */
  static _generateBetId() {
    return `BET${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Sleep helper
   * 
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  static _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Monitor bet status after placement
   * Updates bet status in database when status changes
   * 
   * @param {string} betId - Bet ID to monitor
   * @param {number} timeoutMs - How long to monitor (default: 5 minutes)
   */
  static async monitorBetStatus(betId, timeoutMs = 300000) {
    const startTime = Date.now();
    const checkInterval = 10000; // Check every 10 seconds

    logger.info('Starting bet status monitoring', { betId, timeoutMs });

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Get current bet status from database
        const query = 'SELECT bet_status FROM bet_history WHERE bet_id = $1';
        const result = await db.query(query, [betId]);

        if (result.rows.length === 0) {
          logger.warn('Bet not found in history', { betId });
          break;
        }

        const currentStatus = result.rows[0].bet_status;

        // Terminal statuses - stop monitoring
        if (['won', 'lost', 'void', 'rejected'].includes(currentStatus)) {
          logger.info('Bet reached terminal status', { betId, status: currentStatus });
          break;
        }

        // TODO: Query worker/sportsbook for updated status
        // For now, just wait

        await this._sleep(checkInterval);

      } catch (error) {
        logger.error('Error monitoring bet status', { betId, error: error.message });
        await this._sleep(checkInterval);
      }
    }

    logger.info('Bet status monitoring ended', { betId });
  }
}

module.exports = ExecutionService;
