/**
 * Odds Service
 * Handles odds fetching, parsing, and arbitrage calculations
 */

const logger = require('../utils/logger');
const validators = require('../utils/validators');
const formatters = require('../utils/formatters');
const { URLS, TIMEOUTS } = require('../config/constants');

const oddsService = {
  /**
   * Fetch odds from the bot API
   * @param {string} botUrl - Bot API URL (optional, uses default from config)
   * @param {Object} options - Fetch options
   * @returns {Promise<Object|null>} Odds data or null on failure
   */
  async fetchOdds(botUrl = null, options = {}) {
    const url = botUrl || URLS.BOT;
    
    try {
      logger.info(`Fetching odds from: ${url}/api/odds`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.FETCH);
      
      const response = await fetch(`${url}/api/odds`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        logger.error(`Odds fetch failed with status: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      logger.info('Odds fetched successfully');
      
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.error('Odds fetch timeout');
      } else {
        logger.error('Failed to fetch odds', error);
      }
      return null;
    }
  },

  /**
   * Fetch odds for a specific event
   * @param {string} eventId - Event ID
   * @param {string} botUrl - Bot API URL (optional)
   * @returns {Promise<Object|null>} Event odds or null
   */
  async fetchEventOdds(eventId, botUrl = null) {
    const url = botUrl || URLS.BOT;
    
    try {
      logger.info(`Fetching odds for event: ${eventId}`);
      
      const response = await fetch(`${url}/api/odds/event/${eventId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        logger.error(`Event odds fetch failed: ${eventId}`);
        return null;
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`Failed to fetch event odds: ${eventId}`, error);
      return null;
    }
  },

  /**
   * Parse odds from page content
   * @param {string} content - Page HTML content
   * @param {string} provider - Provider name
   * @returns {Object|null} Parsed odds or null
   */
  parseOdds(content, provider) {
    try {
      logger.debug(`Parsing odds for provider: ${provider}`);
      
      // Provider-specific parsing logic would go here
      // This is a placeholder implementation
      
      const odds = {
        provider,
        home: 0,
        draw: 0,
        away: 0,
        timestamp: new Date().toISOString(),
      };
      
      // TODO: Implement actual parsing logic based on provider
      
      return odds;
    } catch (error) {
      logger.error(`Failed to parse odds for ${provider}`, error);
      return null;
    }
  },

  /**
   * Validate odds data
   * @param {Object} odds - Odds object to validate
   * @returns {boolean} True if valid, false otherwise
   */
  validateOdds(odds) {
    if (!validators.isValidOdds(odds)) {
      logger.warn('Invalid odds data');
      return false;
    }
    
    // Additional validation: check for reasonable odds values
    const { home, draw, away } = odds;
    const homeVal = parseFloat(home);
    const drawVal = parseFloat(draw);
    const awayVal = parseFloat(away);
    
    // Odds should typically be >= 1.01
    if (homeVal < 1.01 || drawVal < 1.01 || awayVal < 1.01) {
      logger.warn('Odds values too low (< 1.01)');
      return false;
    }
    
    // Odds should typically be <= 100
    if (homeVal > 100 || drawVal > 100 || awayVal > 100) {
      logger.warn('Odds values too high (> 100)');
      return false;
    }
    
    return true;
  },

  /**
   * Calculate arbitrage opportunity
   * @param {Object} odds1 - First bookmaker odds
   * @param {Object} odds2 - Second bookmaker odds
   * @param {Object} odds3 - Third bookmaker odds (optional for 2-way arb)
   * @returns {Object|null} Arbitrage calculation or null if no opportunity
   */
  calculateArbitrage(odds1, odds2, odds3 = null) {
    try {
      logger.debug('Calculating arbitrage opportunity');
      
      if (!this.validateOdds(odds1) || !this.validateOdds(odds2)) {
        return null;
      }
      
      // For 3-way arbitrage (home, draw, away)
      if (odds3 && this.validateOdds(odds3)) {
        return this._calculate3WayArbitrage(odds1, odds2, odds3);
      }
      
      // For 2-way arbitrage
      return this._calculate2WayArbitrage(odds1, odds2);
    } catch (error) {
      logger.error('Arbitrage calculation failed', error);
      return null;
    }
  },

  /**
   * Calculate 2-way arbitrage (e.g., home/away)
   * @private
   */
  _calculate2WayArbitrage(odds1, odds2) {
    const home1 = parseFloat(odds1.home);
    const away2 = parseFloat(odds2.away);
    
    const impliedProb = (1 / home1) + (1 / away2);
    const profit = ((1 / impliedProb) - 1) * 100;
    
    if (profit > 0) {
      return {
        type: '2-way',
        profitPercentage: profit.toFixed(2),
        stake: {
          home: (1 / home1) / impliedProb,
          away: (1 / away2) / impliedProb,
        },
        bookmakers: {
          home: odds1.provider,
          away: odds2.provider,
        },
      };
    }
    
    return null;
  },

  /**
   * Calculate 3-way arbitrage (home, draw, away)
   * @private
   */
  _calculate3WayArbitrage(odds1, odds2, odds3) {
    // Find best odds for each outcome
    const bestHome = Math.max(
      parseFloat(odds1.home),
      parseFloat(odds2.home),
      parseFloat(odds3.home)
    );
    const bestDraw = Math.max(
      parseFloat(odds1.draw),
      parseFloat(odds2.draw),
      parseFloat(odds3.draw)
    );
    const bestAway = Math.max(
      parseFloat(odds1.away),
      parseFloat(odds2.away),
      parseFloat(odds3.away)
    );
    
    const impliedProb = (1 / bestHome) + (1 / bestDraw) + (1 / bestAway);
    const profit = ((1 / impliedProb) - 1) * 100;
    
    if (profit > 0) {
      return {
        type: '3-way',
        profitPercentage: profit.toFixed(2),
        stake: {
          home: (1 / bestHome) / impliedProb,
          draw: (1 / bestDraw) / impliedProb,
          away: (1 / bestAway) / impliedProb,
        },
        bestOdds: {
          home: bestHome,
          draw: bestDraw,
          away: bestAway,
        },
      };
    }
    
    return null;
  },

  /**
   * Compare odds from multiple providers
   * @param {Array<Object>} oddsArray - Array of odds objects
   * @returns {Object} Comparison result
   */
  compareOdds(oddsArray) {
    if (!validators.isValidArray(oddsArray, 2)) {
      logger.warn('Need at least 2 odds objects to compare');
      return null;
    }
    
    const comparison = {
      bestHome: { odds: 0, provider: null },
      bestDraw: { odds: 0, provider: null },
      bestAway: { odds: 0, provider: null },
      providers: [],
    };
    
    oddsArray.forEach((oddsObj) => {
      if (!this.validateOdds(oddsObj)) return;
      
      const home = parseFloat(oddsObj.home);
      const draw = parseFloat(oddsObj.draw);
      const away = parseFloat(oddsObj.away);
      
      if (home > comparison.bestHome.odds) {
        comparison.bestHome = { odds: home, provider: oddsObj.provider };
      }
      
      if (draw > comparison.bestDraw.odds) {
        comparison.bestDraw = { odds: draw, provider: oddsObj.provider };
      }
      
      if (away > comparison.bestAway.odds) {
        comparison.bestAway = { odds: away, provider: oddsObj.provider };
      }
      
      comparison.providers.push(oddsObj.provider);
    });
    
    return comparison;
  },

  /**
   * Format odds for display
   * @param {Object} odds - Odds object
   * @returns {Object} Formatted odds
   */
  formatOddsForDisplay(odds) {
    return formatters.formatOdds(odds);
  },

  /**
   * Convert decimal odds to other formats
   * @param {number} decimal - Decimal odds
   * @param {string} format - Target format ('american', 'fractional')
   * @returns {string|number} Converted odds
   */
  convertOddsFormat(decimal, format) {
    const dec = parseFloat(decimal);
    
    switch (format.toLowerCase()) {
      case 'american':
        return dec >= 2.0 ? `+${((dec - 1) * 100).toFixed(0)}` : `-${(100 / (dec - 1)).toFixed(0)}`;
      
      case 'fractional':
        const fraction = dec - 1;
        // Simple fractional conversion (may not be exact)
        return `${fraction.toFixed(2)}/1`;
      
      default:
        return decimal;
    }
  },
};

module.exports = oddsService;
