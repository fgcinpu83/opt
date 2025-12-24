// src/services/tier-filter.service.js - Tier league filtering
const logger = require('../config/logger');

/**
 * Tier 1 - Big Leagues
 */
const TIER_1_LEAGUES = [
  // English Football
  'Premier League', 'English Premier League', 'EPL',
  
  // Spanish Football
  'La Liga', 'Spanish La Liga', 'Primera Division',
  
  // Italian Football
  'Serie A', 'Italian Serie A',
  
  // German Football
  'Bundesliga', 'German Bundesliga',
  
  // French Football
  'Ligue 1', 'French Ligue 1',
  
  // UEFA Competitions
  'Champions League', 'UEFA Champions League', 'UCL',
  'Europa League', 'UEFA Europa League', 'UEL',
  
  // International
  'World Cup', 'FIFA World Cup',
  'European Championship', 'Euro',
  
  // Top Asian Leagues
  'Chinese Super League', 'CSL',
  'J-League', 'J1 League',
  'K-League', 'K League 1'
];

/**
 * Tier 2 - Second Division / Mid-tier Leagues
 */
const TIER_2_LEAGUES = [
  // English
  'Championship', 'English Championship', 'EFL Championship',
  
  // Spanish
  'La Liga 2', 'Segunda Division',
  
  // Italian
  'Serie B', 'Italian Serie B',
  
  // German
  '2. Bundesliga', 'Bundesliga 2',
  
  // French
  'Ligue 2', 'French Ligue 2',
  
  // Other European
  'Eredivisie', 'Dutch Eredivisie',
  'Primeira Liga', 'Portuguese Liga',
  'Belgian Pro League',
  'Scottish Premiership',
  
  // Asia
  'AFC Cup',
  'Asian Champions League'
];

/**
 * Determine tier for a league
 * @param {string} leagueName - League name
 * @returns {number} Tier number (1, 2, or 3)
 */
function getLeagueTier(leagueName) {
  if (!leagueName) return 3;

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
 * @param {Array} opportunities - List of opportunities
 * @param {Array} allowedTiers - Allowed tier numbers [1, 2, 3]
 * @returns {Array} Filtered opportunities
 */
function filterByTier(opportunities, allowedTiers = [1, 2, 3]) {
  if (!Array.isArray(opportunities)) return [];
  if (!Array.isArray(allowedTiers) || allowedTiers.length === 0) {
    return opportunities; // No filtering if no tiers specified
  }

  const filtered = opportunities.filter(opp => {
    const tier = getLeagueTier(opp.league);
    return allowedTiers.includes(tier);
  });

  logger.debug('Tier filtering applied', {
    total: opportunities.length,
    filtered: filtered.length,
    allowed_tiers: allowedTiers
  });

  return filtered;
}

/**
 * Get stake amount based on league tier
 * @param {string} leagueName - League name
 * @param {Object} tierConfig - Tier configuration {tier1: 100, tier2: 50, tier3: 25}
 * @returns {number} Stake amount
 */
function getStakeByTier(leagueName, tierConfig = {}) {
  const tier = getLeagueTier(leagueName);
  
  const defaultConfig = {
    tier1: 100,
    tier2: 50,
    tier3: 25
  };

  const config = { ...defaultConfig, ...tierConfig };

  switch (tier) {
    case 1:
      return config.tier1;
    case 2:
      return config.tier2;
    case 3:
      return config.tier3;
    default:
      return config.tier3;
  }
}

/**
 * Add tier information to opportunity
 * @param {Object} opportunity - Opportunity object
 * @returns {Object} Opportunity with tier info
 */
function enrichWithTierInfo(opportunity) {
  if (!opportunity) return opportunity;

  const tier = getLeagueTier(opportunity.league);
  
  return {
    ...opportunity,
    tier,
    tier_label: `Tier ${tier}`
  };
}

/**
 * Add Tier 1 league (for dynamic configuration)
 * @param {string} leagueName - League name to add
 */
function addTier1League(leagueName) {
  if (!TIER_1_LEAGUES.includes(leagueName)) {
    TIER_1_LEAGUES.push(leagueName);
    logger.info('Added Tier 1 league', { league: leagueName });
  }
}

/**
 * Add Tier 2 league (for dynamic configuration)
 * @param {string} leagueName - League name to add
 */
function addTier2League(leagueName) {
  if (!TIER_2_LEAGUES.includes(leagueName)) {
    TIER_2_LEAGUES.push(leagueName);
    logger.info('Added Tier 2 league', { league: leagueName });
  }
}

/**
 * Get all tier configurations
 * @returns {Object} Tier league lists
 */
function getTierConfigurations() {
  return {
    tier1: TIER_1_LEAGUES,
    tier2: TIER_2_LEAGUES,
    tier3: ['All other leagues']
  };
}

module.exports = {
  getLeagueTier,
  filterByTier,
  getStakeByTier,
  enrichWithTierInfo,
  addTier1League,
  addTier2League,
  getTierConfigurations
};
