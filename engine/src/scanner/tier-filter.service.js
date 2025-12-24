// src/scanner/tier-filter.service.js - Tier-based league filtering

const logger = require('../config/logger');

/**
 * Tier 1: Big leagues (EPL, La Liga, Serie A, Bundesliga, Ligue 1, UCL)
 */
const TIER_1_LEAGUES = [
  // English
  'Premier League',
  'English Premier League',
  'EPL',
  
  // Spanish
  'La Liga',
  'Primera Division',
  'Spanish La Liga',
  
  // Italian
  'Serie A',
  'Italian Serie A',
  
  // German
  'Bundesliga',
  'German Bundesliga',
  
  // French
  'Ligue 1',
  'French Ligue 1',
  
  // European
  'UEFA Champions League',
  'Champions League',
  'UCL',
  'UEFA Europa League',
  'Europa League'
];

/**
 * Tier 2: Division 2 leagues
 */
const TIER_2_LEAGUES = [
  // English
  'Championship',
  'English Championship',
  'EFL Championship',
  
  // Spanish
  'La Liga 2',
  'Segunda Division',
  
  // Italian
  'Serie B',
  'Italian Serie B',
  
  // German
  'Bundesliga 2',
  '2. Bundesliga',
  
  // French
  'Ligue 2',
  'French Ligue 2'
];

/**
 * Determine tier of a league
 * @param {string} leagueName - League name
 * @returns {number} Tier number (1, 2, or 3)
 */
function getLeagueTier(leagueName) {
  if (!leagueName) {
    return 3;
  }

  const normalized = leagueName.toLowerCase().trim();

  // Check Tier 1
  for (const tier1League of TIER_1_LEAGUES) {
    if (normalized.includes(tier1League.toLowerCase())) {
      return 1;
    }
  }

  // Check Tier 2
  for (const tier2League of TIER_2_LEAGUES) {
    if (normalized.includes(tier2League.toLowerCase())) {
      return 2;
    }
  }

  // Default to Tier 3
  return 3;
}

/**
 * Filter opportunities by tier configuration
 * @param {Array} opportunities - Array of opportunities
 * @param {Array} allowedTiers - Array of allowed tier numbers (e.g., [1, 2])
 * @returns {Array} Filtered opportunities
 */
function filterByTier(opportunities, allowedTiers = [1, 2, 3]) {
  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    return [];
  }

  if (!Array.isArray(allowedTiers) || allowedTiers.length === 0) {
    return opportunities;
  }

  const filtered = opportunities.filter(opp => {
    const league = opp.league || opp.bet1?.league;
    const tier = getLeagueTier(league);
    return allowedTiers.includes(tier);
  });

  logger.debug(`Filtered opportunities by tier`, {
    input: opportunities.length,
    output: filtered.length,
    allowedTiers
  });

  return filtered;
}

/**
 * Get tier configuration from config object
 * @param {object} config - Configuration object
 * @returns {Array} Array of allowed tiers
 */
function getAllowedTiersFromConfig(config) {
  if (!config) {
    return [1, 2, 3];
  }

  // Check if config has tier array
  if (Array.isArray(config.tier)) {
    return config.tier;
  }

  // Check if config has individual tier flags
  const allowedTiers = [];
  if (config.tier1 !== false) allowedTiers.push(1);
  if (config.tier2 !== false) allowedTiers.push(2);
  if (config.tier3 !== false) allowedTiers.push(3);

  return allowedTiers.length > 0 ? allowedTiers : [1, 2, 3];
}

/**
 * Add tier information to opportunity
 * @param {object} opportunity - Opportunity object
 * @returns {object} Opportunity with tier info
 */
function addTierInfo(opportunity) {
  const league = opportunity.league || opportunity.bet1?.league;
  const tier = getLeagueTier(league);

  return {
    ...opportunity,
    tier,
    tierInfo: {
      tier,
      league
    }
  };
}

/**
 * Batch add tier information to opportunities
 * @param {Array} opportunities - Array of opportunities
 * @returns {Array} Opportunities with tier info
 */
function addTierInfoBatch(opportunities) {
  if (!Array.isArray(opportunities)) {
    return [];
  }

  return opportunities.map(opp => addTierInfo(opp));
}

module.exports = {
  getLeagueTier,
  filterByTier,
  getAllowedTiersFromConfig,
  addTierInfo,
  addTierInfoBatch,
  TIER_1_LEAGUES,
  TIER_2_LEAGUES
};
