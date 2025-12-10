const logger = require('../config/logger');
const { detectTier } = require('../utils/tier');
const { MAX_ARBITRAGE_PROFIT } = require('../config/arbitrage.config');

/**
 * ArbitrageService - Detect arbitrage opportunities
 * Integrate dengan Python backend_engine logic
 */
class ArbitrageService {
  constructor() {
    this.settings = {
      min_percent: 5,
      max_percent: 120,
      minute_limit_ht: 35,
      minute_limit_ft: 75,
      market_filter: {
        ft_hdp: true,
        ft_ou: true,
        ht_hdp: true,
        ht_ou: true,
      }
    };
  }

  /**
   * Normalize team name (remove player suffix, etc)
   */
  normalizeTeamName(name) {
    if (!name) return '';
    // Remove player suffix in parentheses
    if (name.includes('(') && name.includes(')')) {
      name = name.split('(')[0].trim();
    }
    return name.toLowerCase().trim();
  }

  /**
   * Find canonical team name
   */
  findTeamCanonical(norm) {
    const aliases = {
      'manchester united': ['man united', 'man u'],
      'manchester city': ['man city'],
      'tottenham': ['spurs', 'tottenham hotspur'],
      'chelsea': [],
      'galatasaray': [],
      'sporting': ['sporting lisbon'],
    };

    if (aliases[norm]) return norm;
    
    for (const [canonical, aliasList] of Object.entries(aliases)) {
      if (aliasList.includes(norm)) return canonical;
    }
    
    return norm;
  }

  /**
   * Match events from multiple providers
   */
  matchEvents(oddsByProvider) {
    const grouped = {};

    for (const [provider, matches] of Object.entries(oddsByProvider)) {
      for (const match of matches) {
        const homeNorm = this.normalizeTeamName(match.home_team || '');
        const awayNorm = this.normalizeTeamName(match.away_team || '');
        
        const homeCan = this.findTeamCanonical(homeNorm);
        const awayCan = this.findTeamCanonical(awayNorm);
        
        const teamsSorted = [homeCan, awayCan].sort();
        const sig = `${teamsSorted[0]}_${teamsSorted[1]}`;

        if (!grouped[sig]) {
          grouped[sig] = {
            providers: {},
            match_info: {
              home: homeCan,
              away: awayCan,
              time: match.time || ''
            }
          };
        }

        grouped[sig].providers[provider] = {
          home_norm: homeNorm,
          away_norm: awayNorm,
          odds: match.odds || {},
          time: match.time || '',
          league: match.league || match.league_name || ''
        };
      }
    }

    return grouped;
  }

  /**
   * Calculate margin percentage
   */
  calculateMargin(odds1, odds2) {
    if (!odds1 || !odds2 || odds1 <= 0 || odds2 <= 0) {
      return null;
    }
    try {
      const totalImplied = (1 / odds1) + (1 / odds2);
      const margin = (totalImplied - 1) * 100;
      return Math.round(margin * 100) / 100;
    } catch (e) {
      return null;
    }
  }

  /**
   * Detect arbitrage opportunities
   */
  detectOpportunities(groupedMatches) {
    const opportunities = [];

    for (const [matchSig, eventData] of Object.entries(groupedMatches)) {
      const providers = eventData.providers;
      
      if (Object.keys(providers).length < 2) continue;

      const matchInfo = eventData.match_info;
      
      // Get league name from first provider that has it
      let leagueName = '';
      for (const [provider, matchData] of Object.entries(providers)) {
        if (matchData.league) {
          leagueName = matchData.league;
          break;
        }
      }
      
      // Detect tier for this match
      const tier = detectTier(leagueName);

      for (const market of ['ft_hdp', 'ft_ou', 'ht_hdp', 'ht_ou']) {
        if (!this.settings.market_filter[market]) continue;

        const oddsByProvider = {};
        for (const [provider, matchData] of Object.entries(providers)) {
          const odds = matchData.odds?.[market];
          if (odds) {
            oddsByProvider[provider] = odds;
          }
        }

        if (Object.keys(oddsByProvider).length < 2) continue;

        const homeOvers = [];
        const awayUnders = [];

        for (const [provider, odds] of Object.entries(oddsByProvider)) {
          const homeVal = odds.home || odds.over;
          const awayVal = odds.away || odds.under;
          
          if (homeVal) {
            homeOvers.push({ value: homeVal, provider });
          }
          if (awayVal) {
            awayUnders.push({ value: awayVal, provider });
          }
        }

        if (homeOvers.length === 0 || awayUnders.length === 0) continue;

        homeOvers.sort((a, b) => a.value - b.value);
        awayUnders.sort((a, b) => b.value - a.value);

        const bestHome = homeOvers[0];
        const bestAway = awayUnders[0];

        const margin = this.calculateMargin(bestHome.value, bestAway.value);

        if (!margin) continue;

        if (margin < this.settings.min_percent || margin > this.settings.max_percent) {
          continue;
        }
        
        // Convert margin to decimal profit (e.g., -5% margin = 5% profit = 0.05)
        const profit = Math.abs(margin) / 100;
        
        // Filter out opportunities with profit > MAX_ARBITRAGE_PROFIT (default 10%)
        if (profit > MAX_ARBITRAGE_PROFIT) {
          logger.warn(`Ignored arbitrage with profit=${profit.toFixed(4)} (${(profit * 100).toFixed(2)}%) > ${(MAX_ARBITRAGE_PROFIT * 100).toFixed(0)}% for match ${matchInfo.home} vs ${matchInfo.away}`);
          continue;
        }

        opportunities.push({
          match_id: matchSig,
          home: matchInfo.home,
          away: matchInfo.away,
          time: matchInfo.time,
          market,
          margin,
          profit: profit, // Add profit as decimal
          tier: tier, // Add tier (1, 2, or 3)
          league: leagueName, // Add league name
          legs: [
            {
              site: bestHome.provider,
              league: leagueName,
              match: {
                home: matchInfo.home,
                away: matchInfo.away
              },
              pick: market.includes('hdp') ? 'home' : 'over',
              odds: bestHome.value
            },
            {
              site: bestAway.provider,
              league: leagueName,
              match: {
                home: matchInfo.home,
                away: matchInfo.away
              },
              pick: market.includes('hdp') ? 'away' : 'under',
              odds: bestAway.value
            }
          ],
          // Legacy fields for backward compatibility
          leg_1: {
            provider: bestHome.provider,
            odds: bestHome.value,
            side: market.includes('hdp') ? 'home' : 'over'
          },
          leg_2: {
            provider: bestAway.provider,
            odds: bestAway.value,
            side: market.includes('hdp') ? 'away' : 'under'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    return opportunities;
  }

  /**
   * Process odds from multiple providers
   */
  processOdds(oddsByProvider) {
    try {
      const grouped = this.matchEvents(oddsByProvider);
      const opportunities = this.detectOpportunities(grouped);

      return {
        timestamp: new Date().toISOString(),
        providers: Object.keys(oddsByProvider).length,
        events_matched: Object.keys(grouped).length,
        opportunities_found: opportunities.length,
        opportunities
      };
    } catch (error) {
      logger.error('Error processing odds:', error);
      throw error;
    }
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }
}

module.exports = new ArbitrageService();
