// src/config/arbitrage.config.js - Arbitrage detection configuration

/**
 * Maximum allowed arbitrage profit percentage
 * Opportunities with profit > this value will be ignored
 * 
 * Default: 0.10 (10%)
 * 
 * Example:
 * - 0.05 = 5%
 * - 0.10 = 10%
 * - 0.15 = 15%
 */
const MAX_ARBITRAGE_PROFIT = parseFloat(process.env.MAX_ARBITRAGE_PROFIT || '0.10');

/**
 * Minimum arbitrage profit to consider an opportunity
 * Default: 0.01 (1%)
 */
const MIN_ARBITRAGE_PROFIT = parseFloat(process.env.MIN_ARBITRAGE_PROFIT || '0.01');

/**
 * Market filters - which markets to scan
 */
const MARKET_FILTERS = {
  ft_hdp: process.env.MARKET_FT_HDP !== 'false',
  ft_ou: process.env.MARKET_FT_OU !== 'false',
  ht_hdp: process.env.MARKET_HT_HDP !== 'false',
  ht_ou: process.env.MARKET_HT_OU !== 'false'
};

/**
 * Time limits for half-time and full-time markets
 */
const TIME_LIMITS = {
  minute_limit_ht: parseInt(process.env.MINUTE_LIMIT_HT || '35', 10),
  minute_limit_ft: parseInt(process.env.MINUTE_LIMIT_FT || '75', 10)
};

module.exports = {
  MAX_ARBITRAGE_PROFIT,
  MIN_ARBITRAGE_PROFIT,
  MARKET_FILTERS,
  TIME_LIMITS
};
