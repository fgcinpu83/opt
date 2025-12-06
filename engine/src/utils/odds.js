// utils/odds.js - Odds conversion utilities

/**
 * Convert various odds formats to Decimal (European) format
 * Supports: Indo, Malay, HK (Hong Kong), Decimal
 */

/**
 * Convert Indonesian odds to Decimal
 * Indo >= 1.00: Decimal = Indo + 1
 * Indo < 1.00: Decimal = 1 / |Indo| + 1
 * 
 * @param {number} indoOdds - Indonesian odds
 * @returns {number} Decimal odds
 */
function indoToDecimal(indoOdds) {
  if (indoOdds >= 1.00) {
    return indoOdds + 1;
  } else {
    return (1 / Math.abs(indoOdds)) + 1;
  }
}

/**
 * Convert Malay odds to Decimal
 * Malay > 0: Decimal = Malay + 1
 * Malay < 0: Decimal = (1 / |Malay|) + 1
 * 
 * @param {number} malayOdds - Malay odds
 * @returns {number} Decimal odds
 */
function malayToDecimal(malayOdds) {
  if (malayOdds > 0) {
    return malayOdds + 1;
  } else {
    return (1 / Math.abs(malayOdds)) + 1;
  }
}

/**
 * Convert Hong Kong odds to Decimal
 * HK odds are essentially Decimal - 1
 * 
 * @param {number} hkOdds - Hong Kong odds
 * @returns {number} Decimal odds
 */
function hkToDecimal(hkOdds) {
  return hkOdds + 1;
}

/**
 * Convert American odds to Decimal
 * American > 0: Decimal = (American / 100) + 1
 * American < 0: Decimal = (100 / |American|) + 1
 * 
 * @param {number} americanOdds - American odds
 * @returns {number} Decimal odds
 */
function americanToDecimal(americanOdds) {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

/**
 * Main conversion function - converts any odds format to Decimal
 * 
 * @param {number} odds - The odds value
 * @param {string} format - Format: 'decimal', 'indo', 'malay', 'hk', 'american'
 * @returns {number} Decimal odds
 */
function convertToDecimal(odds, format = 'decimal') {
  const oddsNum = parseFloat(odds);
  
  if (isNaN(oddsNum)) {
    throw new Error(`Invalid odds value: ${odds}`);
  }

  const normalizedFormat = format.toLowerCase();

  switch (normalizedFormat) {
    case 'decimal':
    case 'euro':
    case 'european':
      return oddsNum;
    
    case 'indo':
    case 'indonesian':
      return indoToDecimal(oddsNum);
    
    case 'malay':
    case 'malaysian':
      return malayToDecimal(oddsNum);
    
    case 'hk':
    case 'hongkong':
    case 'hong kong':
      return hkToDecimal(oddsNum);
    
    case 'american':
    case 'us':
      return americanToDecimal(oddsNum);
    
    default:
      throw new Error(`Unknown odds format: ${format}`);
  }
}

/**
 * Calculate implied probability from decimal odds
 * 
 * @param {number} decimalOdds - Decimal odds
 * @returns {number} Implied probability (0-1)
 */
function calculateImpliedProbability(decimalOdds) {
  return 1 / decimalOdds;
}

/**
 * Calculate arbitrage percentage
 * Returns positive number if arbitrage exists, negative if overround
 * 
 * @param {number} odds1 - Decimal odds for outcome 1
 * @param {number} odds2 - Decimal odds for outcome 2
 * @returns {number} Arbitrage percentage
 */
function calculateArbitragePercentage(odds1, odds2) {
  const prob1 = calculateImpliedProbability(odds1);
  const prob2 = calculateImpliedProbability(odds2);
  const totalProb = prob1 + prob2;
  
  // Return profit percentage
  // If totalProb < 1, there's an arbitrage opportunity
  return ((1 / totalProb) - 1) * 100;
}

/**
 * Calculate optimal stakes for arbitrage betting
 * 
 * @param {number} totalStake - Total amount to bet
 * @param {number} odds1 - Decimal odds for outcome 1
 * @param {number} odds2 - Decimal odds for outcome 2
 * @returns {Object} Stakes for each outcome
 */
function calculateArbitrageStakes(totalStake, odds1, odds2) {
  const prob1 = calculateImpliedProbability(odds1);
  const prob2 = calculateImpliedProbability(odds2);
  const totalProb = prob1 + prob2;
  
  const stake1 = (prob1 / totalProb) * totalStake;
  const stake2 = (prob2 / totalProb) * totalStake;
  
  // Calculate expected payout (should be equal for both outcomes)
  const payout1 = stake1 * odds1;
  const payout2 = stake2 * odds2;
  
  // Calculate profit
  const profit = payout1 - totalStake;
  const profitPercentage = (profit / totalStake) * 100;
  
  return {
    stake1: parseFloat(stake1.toFixed(2)),
    stake2: parseFloat(stake2.toFixed(2)),
    payout1: parseFloat(payout1.toFixed(2)),
    payout2: parseFloat(payout2.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
    profitPercentage: parseFloat(profitPercentage.toFixed(2)),
    totalStake: parseFloat(totalStake.toFixed(2))
  };
}

/**
 * Validate if odds value is reasonable
 * 
 * @param {number} decimalOdds - Decimal odds to validate
 * @returns {boolean} True if valid
 */
function isValidDecimalOdds(decimalOdds) {
  // Decimal odds should be >= 1.01 and <= 1000 (reasonable range)
  return decimalOdds >= 1.01 && decimalOdds <= 1000;
}

/**
 * Format decimal odds for display
 * 
 * @param {number} decimalOdds - Decimal odds
 * @param {number} precision - Decimal places (default: 2)
 * @returns {string} Formatted odds
 */
function formatDecimalOdds(decimalOdds, precision = 2) {
  return decimalOdds.toFixed(precision);
}

module.exports = {
  convertToDecimal,
  indoToDecimal,
  malayToDecimal,
  hkToDecimal,
  americanToDecimal,
  calculateImpliedProbability,
  calculateArbitragePercentage,
  calculateArbitrageStakes,
  isValidDecimalOdds,
  formatDecimalOdds
};
