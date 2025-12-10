// src/utils/tier.js - League tier detection utility

/**
 * Detect league tier based on league name
 * Tier 1: Major leagues (Premier League, La Liga, Serie A, etc.)
 * Tier 2: Secondary leagues (Championship, Segunda, Serie B, etc.)
 * Tier 3: All other leagues
 * 
 * @param {string} leagueName - The league name to classify
 * @returns {1 | 2 | 3} - The tier level
 */
function detectTier(leagueName) {
  if (!leagueName || typeof leagueName !== 'string') {
    return 3; // Default to tier 3 for unknown leagues
  }

  // Normalize to lowercase for case-insensitive matching
  const normalized = leagueName.toLowerCase();

  // Tier 1: Major leagues (substring match)
  const tier1Leagues = [
    'premier league',
    'la liga',
    'serie a',
    'bundesliga',
    'ligue 1',
    'champions league',
    'europa league',
    'uefa champions',
    'uefa europa',
    'ucl',
    'uel'
  ];

  for (const league of tier1Leagues) {
    if (normalized.includes(league)) {
      return 1;
    }
  }

  // Tier 2: Secondary leagues (substring match)
  const tier2Leagues = [
    'championship',
    'segunda',
    'serie b',
    '2. bundesliga',
    'ligue 2',
    'eredivisie',
    'primeira liga',
    'liga mx',
    'mls',
    'super lig',
    'jupiler pro league'
  ];

  for (const league of tier2Leagues) {
    if (normalized.includes(league)) {
      return 2;
    }
  }

  // Tier 3: All other leagues
  return 3;
}

/**
 * Get tier priority for sorting
 * Lower number = higher priority
 * @param {1 | 2 | 3} tier 
 * @returns {number}
 */
function getTierPriority(tier) {
  const priorities = {
    1: 100,
    2: 50,
    3: 10
  };
  return priorities[tier] || 0;
}

module.exports = {
  detectTier,
  getTierPriority
};
