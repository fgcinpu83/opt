// utils/betting.js - Betting utilities (rounding, validation, etc.)

/**
 * Round bet amount to nearest 0 or 5
 * Examples: 
 *   153 -> 155
 *   152 -> 150
 *   157 -> 155
 *   158 -> 160
 * 
 * @param {number} amount - Original bet amount
 * @param {string} direction - 'nearest' (default), 'up', 'down'
 * @returns {number} Rounded amount
 */
function roundBetAmount(amount, direction = 'nearest') {
  const lastDigit = amount % 10;
  
  if (lastDigit === 0 || lastDigit === 5) {
    // Already rounded
    return amount;
  }
  
  let rounded;
  
  switch (direction) {
    case 'up':
      // Round up to next 0 or 5
      if (lastDigit < 5) {
        rounded = Math.floor(amount / 10) * 10 + 5;
      } else {
        rounded = Math.ceil(amount / 10) * 10;
      }
      break;
    
    case 'down':
      // Round down to previous 0 or 5
      if (lastDigit <= 5) {
        rounded = Math.floor(amount / 10) * 10;
      } else {
        rounded = Math.floor(amount / 10) * 10 + 5;
      }
      break;
    
    case 'nearest':
    default:
      // Round to nearest 0 or 5
      if (lastDigit < 3) {
        // 1, 2 -> 0
        rounded = Math.floor(amount / 10) * 10;
      } else if (lastDigit < 8) {
        // 3, 4, 6, 7 -> 5
        rounded = Math.floor(amount / 10) * 10 + 5;
      } else {
        // 8, 9 -> next 10
        rounded = Math.ceil(amount / 10) * 10;
      }
      break;
  }
  
  return rounded;
}

/**
 * Round both stakes for arbitrage bet while maintaining profit
 * Adjusts stakes to ensure both end with 0 or 5
 * 
 * @param {number} stake1 - Original stake for bet 1
 * @param {number} stake2 - Original stake for bet 2
 * @param {number} odds1 - Decimal odds for bet 1
 * @param {number} odds2 - Decimal odds for bet 2
 * @returns {Object} Rounded stakes with profit info
 */
function roundArbitrageStakes(stake1, stake2, odds1, odds2) {
  // Round both stakes to nearest 0 or 5
  const roundedStake1 = roundBetAmount(stake1, 'nearest');
  const roundedStake2 = roundBetAmount(stake2, 'nearest');
  
  // Calculate new total stake and payouts
  const totalStake = roundedStake1 + roundedStake2;
  const payout1 = roundedStake1 * odds1;
  const payout2 = roundedStake2 * odds2;
  
  // Use minimum payout (worst case)
  const minPayout = Math.min(payout1, payout2);
  const profit = minPayout - totalStake;
  const profitPercentage = (profit / totalStake) * 100;
  
  return {
    stake1: roundedStake1,
    stake2: roundedStake2,
    totalStake,
    payout1: parseFloat(payout1.toFixed(2)),
    payout2: parseFloat(payout2.toFixed(2)),
    minPayout: parseFloat(minPayout.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
    profitPercentage: parseFloat(profitPercentage.toFixed(2)),
    originalStake1: stake1,
    originalStake2: stake2,
    roundingDiff1: roundedStake1 - stake1,
    roundingDiff2: roundedStake2 - stake2
  };
}

/**
 * Validate bet amount against min/max limits
 * 
 * @param {number} amount - Bet amount to validate
 * @param {Object} limits - Min/max limits {min, max}
 * @returns {Object} Validation result
 */
function validateBetAmount(amount, limits = {}) {
  const { min = 10, max = 1000000 } = limits;
  
  const errors = [];
  
  if (amount < min) {
    errors.push(`Bet amount ${amount} is below minimum ${min}`);
  }
  
  if (amount > max) {
    errors.push(`Bet amount ${amount} exceeds maximum ${max}`);
  }
  
  // Check if amount is positive number
  if (amount <= 0 || !isFinite(amount)) {
    errors.push('Bet amount must be a positive number');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    amount
  };
}

/**
 * Calculate potential payout for a bet
 * 
 * @param {number} stake - Bet stake
 * @param {number} decimalOdds - Decimal odds
 * @returns {Object} Payout information
 */
function calculatePayout(stake, decimalOdds) {
  const payout = stake * decimalOdds;
  const profit = payout - stake;
  
  return {
    stake: parseFloat(stake.toFixed(2)),
    odds: decimalOdds,
    payout: parseFloat(payout.toFixed(2)),
    profit: parseFloat(profit.toFixed(2))
  };
}

/**
 * Determine which bet should be placed first (value bet)
 * Value bet is the one with higher odds (higher payout)
 * 
 * @param {number} odds1 - Decimal odds for bet 1
 * @param {number} odds2 - Decimal odds for bet 2
 * @returns {string} 'bet1' or 'bet2'
 */
function determineValueBet(odds1, odds2) {
  // Higher odds = better value = place first
  return odds1 > odds2 ? 'bet1' : 'bet2';
}

/**
 * Format currency for display
 * 
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'IDR')
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'IDR') {
  const locale = currency === 'IDR' ? 'id-ID' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Calculate Kelly Criterion stake size
 * More conservative staking method
 * 
 * @param {number} bankroll - Total bankroll
 * @param {number} decimalOdds - Decimal odds
 * @param {number} winProbability - Estimated win probability (0-1)
 * @param {number} kelly - Kelly fraction (0-1, typically 0.25 for quarter Kelly)
 * @returns {number} Recommended stake
 */
function calculateKellyStake(bankroll, decimalOdds, winProbability, kelly = 0.25) {
  // Kelly formula: (bp - q) / b
  // where b = decimal odds - 1, p = win probability, q = 1 - p
  const b = decimalOdds - 1;
  const p = winProbability;
  const q = 1 - p;
  
  const kellyFraction = (b * p - q) / b;
  
  // Apply Kelly fraction multiplier for safety
  const stake = bankroll * kellyFraction * kelly;
  
  // Ensure stake is not negative
  return Math.max(0, stake);
}

/**
 * Split stake across multiple bets evenly
 * 
 * @param {number} totalStake - Total stake to split
 * @param {number} numBets - Number of bets
 * @returns {Array<number>} Array of rounded stakes
 */
function splitStake(totalStake, numBets) {
  const baseStake = totalStake / numBets;
  const stakes = [];
  
  for (let i = 0; i < numBets; i++) {
    stakes.push(roundBetAmount(baseStake, 'nearest'));
  }
  
  return stakes;
}

/**
 * Calculate arbitrage profit with commission/fees
 * 
 * @param {number} stake1 - Stake for bet 1
 * @param {number} stake2 - Stake for bet 2
 * @param {number} odds1 - Odds for bet 1
 * @param {number} odds2 - Odds for bet 2
 * @param {number} commission - Commission percentage (0-100)
 * @returns {Object} Profit calculation with commission
 */
function calculateProfitWithCommission(stake1, stake2, odds1, odds2, commission = 0) {
  const totalStake = stake1 + stake2;
  const payout1 = stake1 * odds1;
  const payout2 = stake2 * odds2;
  
  // Calculate commission on winnings
  const commissionAmount1 = (payout1 - stake1) * (commission / 100);
  const commissionAmount2 = (payout2 - stake2) * (commission / 100);
  
  const netPayout1 = payout1 - commissionAmount1;
  const netPayout2 = payout2 - commissionAmount2;
  
  const minNetPayout = Math.min(netPayout1, netPayout2);
  const profit = minNetPayout - totalStake;
  const profitPercentage = (profit / totalStake) * 100;
  
  return {
    totalStake,
    payout1: parseFloat(payout1.toFixed(2)),
    payout2: parseFloat(payout2.toFixed(2)),
    commission1: parseFloat(commissionAmount1.toFixed(2)),
    commission2: parseFloat(commissionAmount2.toFixed(2)),
    netPayout1: parseFloat(netPayout1.toFixed(2)),
    netPayout2: parseFloat(netPayout2.toFixed(2)),
    minNetPayout: parseFloat(minNetPayout.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
    profitPercentage: parseFloat(profitPercentage.toFixed(2))
  };
}

module.exports = {
  roundBetAmount,
  roundArbitrageStakes,
  validateBetAmount,
  calculatePayout,
  determineValueBet,
  formatCurrency,
  calculateKellyStake,
  splitStake,
  calculateProfitWithCommission
};
