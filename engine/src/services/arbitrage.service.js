// services/arbitrage.service.js - Arbitrage calculation and filtering engine

const { convertToDecimal, calculateArbitragePercentage, calculateArbitrageStakes } = require('../utils/odds');
const { roundArbitrageStakes, determineValueBet } = require('../utils/betting');
const logger = require('../config/logger');

class ArbitrageService {
  /**
   * Analyze potential arbitrage opportunity
   * 
   * @param {Object} opportunity - Opportunity data
   * @param {Object} config - User configuration
   * @returns {Object} Analysis result with pass/fail and reasons
   */
  static analyzeOpportunity(opportunity, config) {
    const analysis = {
      passed: true,
      failed: false,
      reasons: [],
      warnings: [],
      opportunity: null,
      config
    };

    try {
      // Convert odds to decimal format
      const oddsA = convertToDecimal(
        opportunity.side_a_odds,
        opportunity.side_a_odds_format || 'decimal'
      );
      const oddsB = convertToDecimal(
        opportunity.side_b_odds,
        opportunity.side_b_odds_format || 'decimal'
      );

      // Calculate arbitrage percentage
      const arbPercentage = calculateArbitragePercentage(oddsA, oddsB);

      // FILTER 1: Check if valid arbitrage exists
      if (arbPercentage <= 0) {
        analysis.passed = false;
        analysis.failed = true;
        analysis.reasons.push('No arbitrage opportunity - overround market');
        return analysis;
      }

      // FILTER 2: Min profit filter
      if (arbPercentage < config.min_profit_percentage) {
        analysis.passed = false;
        analysis.failed = true;
        analysis.reasons.push(
          `Profit ${arbPercentage.toFixed(2)}% below minimum ${config.min_profit_percentage}%`
        );
        return analysis;
      }

      // FILTER 3: Max profit filter (SAFETY - Anti-Trap)
      if (arbPercentage > config.max_profit_percentage) {
        analysis.passed = false;
        analysis.failed = true;
        analysis.reasons.push(
          `Profit ${arbPercentage.toFixed(2)}% exceeds maximum ${config.max_profit_percentage}% - POSSIBLE TRAP`
        );
        return analysis;
      }

      // FILTER 4: Match status filter
      if (config.match_filter === 'prematch' && opportunity.match_status !== 'prematch') {
        analysis.passed = false;
        analysis.failed = true;
        analysis.reasons.push('Live matches disabled in configuration');
        return analysis;
      }

      if (config.match_filter === 'live' && opportunity.match_status !== 'live') {
        analysis.passed = false;
        analysis.failed = true;
        analysis.reasons.push('Prematch disabled in configuration');
        return analysis;
      }

      // FILTER 5: Time filter (for live matches - Anti-Ghost Bet)
      if (opportunity.match_status === 'live') {
        const minute = opportunity.match_minute || 0;
        
        // Check if market is halftime
        const isHalftime = opportunity.market_type?.startsWith('ht_');
        const maxMinute = isHalftime ? config.max_minute_ht : config.max_minute_ft;

        if (minute > maxMinute) {
          analysis.passed = false;
          analysis.failed = true;
          analysis.reasons.push(
            `Match minute ${minute} exceeds max ${maxMinute} for ${isHalftime ? 'HT' : 'FT'} - GHOST BET RISK`
          );
          return analysis;
        }

        // Warning for matches close to limit
        if (minute > maxMinute - 5) {
          analysis.warnings.push(
            `Match minute ${minute} is close to limit ${maxMinute} - act fast`
          );
        }
      }

      // FILTER 6: Market filter
      const enabledMarkets = config.enabled_markets || [
        'ft_hdp',
        'ft_ou',
        'ht_hdp',
        'ht_ou'
      ];

      if (!enabledMarkets.includes(opportunity.market_type)) {
        analysis.passed = false;
        analysis.failed = true;
        analysis.reasons.push(
          `Market type ${opportunity.market_type} is disabled in configuration`
        );
        return analysis;
      }

      // Get tier configuration and bet amount
      const tierConfig = this._getTierConfig(opportunity.league, config.tiers);
      const betAmount = tierConfig.bet_amount;

      // Calculate optimal stakes
      const stakes = calculateArbitrageStakes(betAmount, oddsA, oddsB);

      // Round stakes to nearest 0 or 5
      const roundedStakes = roundArbitrageStakes(
        stakes.stake1,
        stakes.stake2,
        oddsA,
        oddsB
      );

      // Check if rounding killed profitability
      if (roundedStakes.profitPercentage < config.min_profit_percentage) {
        analysis.passed = false;
        analysis.failed = true;
        analysis.reasons.push(
          `Profit after rounding ${roundedStakes.profitPercentage.toFixed(2)}% below minimum ${config.min_profit_percentage}%`
        );
        return analysis;
      }

      // Determine which side to bet first (value bet)
      const valueBetSide = determineValueBet(oddsA, oddsB);

      // Build final opportunity object
      analysis.opportunity = {
        ...opportunity,
        // Normalized odds
        side_a_odds_decimal: parseFloat(oddsA.toFixed(4)),
        side_b_odds_decimal: parseFloat(oddsB.toFixed(4)),
        
        // Tier info
        tier: tierConfig.tier_name,
        tier_label: tierConfig.tier_label,
        tier_priority: tierConfig.priority,
        
        // Stakes (rounded)
        side_a_stake: valueBetSide === 'bet1' ? roundedStakes.stake1 : roundedStakes.stake2,
        side_b_stake: valueBetSide === 'bet1' ? roundedStakes.stake2 : roundedStakes.stake1,
        total_stake: roundedStakes.totalStake,
        
        // Profit calculation
        profit_percentage: roundedStakes.profitPercentage,
        expected_profit: roundedStakes.profit,
        min_payout: roundedStakes.minPayout,
        
        // Execution order
        value_bet_side: valueBetSide === 'bet1' ? 'side_a' : 'side_b',
        hedge_bet_side: valueBetSide === 'bet1' ? 'side_b' : 'side_a',
        
        // Metadata
        analyzed_at: new Date().toISOString(),
        original_stakes: {
          stake1: stakes.stake1,
          stake2: stakes.stake2
        },
        rounding_applied: true
      };

      logger.info('Opportunity analysis passed', {
        match: opportunity.match_name,
        profit: roundedStakes.profitPercentage,
        tier: tierConfig.tier_name
      });

    } catch (error) {
      analysis.passed = false;
      analysis.failed = true;
      analysis.reasons.push(`Analysis error: ${error.message}`);
      logger.error('Opportunity analysis failed', { error: error.message, opportunity });
    }

    return analysis;
  }

  /**
   * Get tier configuration based on league
   * 
   * @param {string} league - League name
   * @param {Array} tiers - Tier configurations
   * @returns {Object} Tier configuration
   */
  static _getTierConfig(league, tiers) {
    // Sort tiers by priority (highest first)
    const sortedTiers = [...tiers].sort((a, b) => b.priority - a.priority);

    // Find matching tier by league
    for (const tier of sortedTiers) {
      if (tier.leagues && tier.leagues.includes(league)) {
        return tier;
      }
    }

    // Default to lowest tier if no match
    return sortedTiers[sortedTiers.length - 1] || {
      tier_name: 'tier3',
      tier_label: 'Default',
      bet_amount: 250,
      priority: 1
    };
  }

  /**
   * Prioritize multiple opportunities
   * Returns sorted list by priority
   * 
   * @param {Array} opportunities - Array of analyzed opportunities
   * @returns {Array} Sorted opportunities
   */
  static prioritizeOpportunities(opportunities) {
    return opportunities
      .filter(opp => opp.passed && opp.opportunity)
      .map(opp => opp.opportunity)
      .sort((a, b) => {
        // 1. Sort by tier priority (higher first)
        if (a.tier_priority !== b.tier_priority) {
          return b.tier_priority - a.tier_priority;
        }
        
        // 2. If same tier, sort by profit percentage (higher first)
        if (a.profit_percentage !== b.profit_percentage) {
          return b.profit_percentage - a.profit_percentage;
        }
        
        // 3. If same profit, sort by detection time (older first - FIFO)
        return new Date(a.created_at) - new Date(b.created_at);
      });
  }

  /**
   * Validate opportunity data structure
   * 
   * @param {Object} opportunity - Opportunity to validate
   * @returns {Object} Validation result
   */
  static validateOpportunity(opportunity) {
    const required = [
      'match_name',
      'league',
      'market_type',
      'side_a_sportsbook',
      'side_a_odds',
      'side_a_selection',
      'side_b_sportsbook',
      'side_b_odds',
      'side_b_selection'
    ];

    const missing = required.filter(field => !opportunity[field]);

    if (missing.length > 0) {
      return {
        valid: false,
        errors: [`Missing required fields: ${missing.join(', ')}`]
      };
    }

    // Additional validations
    const errors = [];

    if (opportunity.side_a_sportsbook === opportunity.side_b_sportsbook) {
      errors.push('Both sides cannot be from the same sportsbook');
    }

    if (opportunity.side_a_odds <= 0 || opportunity.side_b_odds <= 0) {
      errors.push('Odds must be positive numbers');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate break-even odds for hedging
   * Useful when first bet is already placed
   * 
   * @param {number} stake1 - First bet stake
   * @param {number} odds1 - First bet decimal odds
   * @param {number} desiredProfit - Desired profit amount
   * @returns {Object} Break-even calculation
   */
  static calculateBreakEvenOdds(stake1, odds1, desiredProfit = 0) {
    const payout1 = stake1 * odds1;
    const targetPayout = payout1;
    
    // We want: stake2 * odds2 = targetPayout
    // And: (targetPayout - stake1 - stake2) = desiredProfit
    // So: stake2 = targetPayout - stake1 - desiredProfit
    
    const stake2 = targetPayout - stake1 - desiredProfit;
    const breakEvenOdds = targetPayout / stake2;
    
    return {
      stake2: parseFloat(stake2.toFixed(2)),
      breakEvenOdds: parseFloat(breakEvenOdds.toFixed(4)),
      targetPayout: parseFloat(targetPayout.toFixed(2)),
      profit: desiredProfit
    };
  }
}

module.exports = ArbitrageService;
