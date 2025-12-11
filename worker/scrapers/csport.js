/**
 * C-Sport Scraper (via QQ188)
 * Fetches odds data from C-Sport using QQ188 API
 */

const axios = require('axios');
const logger = require('../utils/logger');
const sessionManager = require('../sessions/sessionManager');
const browserService = require('../services/browserService');

// C-Sport API Configuration
const CSPORT_CONFIG = {
  url: 'https://mylv.5336267.com/Member/BetsView/BetLight/DataOdds.ashx',
  loginUrl: 'https://mylv.5336267.com/Member/Login',
  provider: 'qq188',
  sport: 'soccer',
};

/**
 * Build form data payload for C-Sport API
 * @returns {URLSearchParams} Form data payload
 */
function buildPayload() {
  const params = new URLSearchParams();
  params.append('fc', '5');
  params.append('m_accType', 'MY MR');
  params.append('SystemLanguage', 'en-US');
  params.append('TimeFilter', '0');
  params.append('m_gameType', 'S_');
  params.append('m_SortByTime', '0');
  params.append('m_LeagueList', '');
  params.append('SingleDouble', 'double');
  params.append('clientTime', Math.floor(Date.now() / 1000).toString());
  params.append('c', 'A');
  params.append('fav', '');
  params.append('exlist', '0');
  params.append('keywords', '');
  params.append('m_sp', '0');
  
  return params;
}

/**
 * Convert cookies array to cookie string for HTTP headers
 * @param {Array} cookies - Array of cookie objects
 * @returns {string} Cookie header string
 */
function cookiesToString(cookies) {
  if (!Array.isArray(cookies)) {
    return '';
  }
  
  return cookies
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

/**
 * Parse C-Sport API response to standardized format
 * @param {Object} data - Raw API response
 * @returns {Object} Standardized odds data
 */
function parseResponse(data) {
  const matches = [];
  
  try {
    // C-Sport response structure may vary
    // This is a generic parser that should be adapted based on actual response
    
    if (data && data.d && Array.isArray(data.d)) {
      for (const item of data.d) {
        // Extract match information
        const match = {
          match_id: item.id || item.matchId || `csport_${Date.now()}_${Math.random()}`,
          home_team: item.homeTeam || item.home || 'Unknown',
          away_team: item.awayTeam || item.away || 'Unknown',
          league: item.league || item.leagueName || 'Unknown',
          start_time: item.startTime || item.matchTime || null,
          odds: {
            home: parseFloat(item.homeOdds || item.odds1 || 0),
            draw: parseFloat(item.drawOdds || item.oddsX || 0),
            away: parseFloat(item.awayOdds || item.odds2 || 0),
          },
        };
        
        // Only add matches with valid odds
        if (match.odds.home > 0 || match.odds.away > 0) {
          matches.push(match);
        }
      }
    } else if (data && Array.isArray(data)) {
      // Alternative response format
      for (const item of data) {
        const match = {
          match_id: item.id || `csport_${Date.now()}_${Math.random()}`,
          home_team: item.homeTeam || item.home || 'Unknown',
          away_team: item.awayTeam || item.away || 'Unknown',
          league: item.league || 'Unknown',
          start_time: item.startTime || null,
          odds: {
            home: parseFloat(item.homeOdds || item.odds1 || 0),
            draw: parseFloat(item.drawOdds || item.oddsX || 0),
            away: parseFloat(item.awayOdds || item.odds2 || 0),
          },
        };
        
        if (match.odds.home > 0 || match.odds.away > 0) {
          matches.push(match);
        }
      }
    }
    
    logger.info(`Parsed ${matches.length} matches from C-Sport response`);
  } catch (error) {
    logger.error('Error parsing C-Sport response', error);
  }
  
  return {
    provider: 'csport',
    sport: CSPORT_CONFIG.sport,
    timestamp: new Date().toISOString(),
    matches,
  };
}

/**
 * Perform login to QQ188/C-Sport
 * @param {Object} page - Playwright page
 * @param {Object} credentials - Login credentials
 * @returns {Promise<boolean>} True if login successful
 */
async function performLogin(page, credentials) {
  try {
    const { username, password } = credentials;
    
    logger.info('Performing QQ188 login...');
    
    // Wait for login page to load
    await page.waitForLoadState('networkidle');
    
    // Fill in username
    const usernameSelector = 'input[name="username"], input[id="username"], input[type="text"]';
    await page.waitForSelector(usernameSelector, { timeout: 10000 });
    await page.fill(usernameSelector, username);
    
    // Fill in password
    const passwordSelector = 'input[name="password"], input[id="password"], input[type="password"]';
    await page.fill(passwordSelector, password);
    
    // Click login button
    const loginButtonSelector = 'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")';
    await page.click(loginButtonSelector);
    
    // Wait for navigation or response
    await page.waitForTimeout(3000);
    
    // Check if login was successful
    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes('login') && !currentUrl.includes('signin');
    
    if (isLoggedIn) {
      logger.info('QQ188 login successful');
    } else {
      logger.error('QQ188 login failed - still on login page');
    }
    
    return isLoggedIn;
  } catch (error) {
    logger.error('Error during QQ188 login', error);
    return false;
  }
}

/**
 * Fetch odds from C-Sport API
 * @param {Object} credentials - Login credentials {username, password}
 * @returns {Promise<Object|null>} Standardized odds data or null on failure
 */
async function fetchOdds(credentials) {
  try {
    logger.info('Fetching odds from C-Sport...');
    
    if (!credentials || !credentials.username || !credentials.password) {
      logger.error('Missing credentials for C-Sport');
      return null;
    }
    
    // Get or create session from Redis
    const providerConfig = {
      id: CSPORT_CONFIG.provider,
      name: 'QQ188 C-Sport',
    };
    
    let sessionData = await sessionManager.retrieveSession(
      CSPORT_CONFIG.provider,
      credentials.username
    );
    
    // Validate session
    if (!sessionData || !sessionManager.validateSession(sessionData)) {
      logger.info('No valid session found, creating new session...');
      
      // Create new session using browser
      const session = await sessionManager.createSession(
        providerConfig,
        CSPORT_CONFIG.loginUrl,
        credentials,
        null // No proxy for now
      );
      
      if (!session) {
        logger.error('Failed to create session for C-Sport');
        return null;
      }
      
      sessionData = {
        provider: CSPORT_CONFIG.provider,
        username: credentials.username,
        cookies: session.cookies,
      };
    }
    
    // Use cookies for API call
    const cookieString = cookiesToString(sessionData.cookies);
    
    logger.debug('Making API request to C-Sport...');
    
    const response = await axios.post(
      CSPORT_CONFIG.url,
      buildPayload(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': cookieString,
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.9',
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 15000,
      }
    );
    
    logger.info(`C-Sport API response status: ${response.status}`);
    
    if (response.status === 200 && response.data) {
      const parsedData = parseResponse(response.data);
      logger.info(`Successfully fetched ${parsedData.matches.length} matches from C-Sport`);
      return parsedData;
    } else {
      logger.warn('C-Sport API returned non-200 status or empty data');
      return null;
    }
  } catch (error) {
    logger.error('Error fetching odds from C-Sport', error);
    
    // If 401/403, session might be invalid - clear it
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      logger.warn('Session appears invalid (401/403), will need to re-login on next attempt');
    }
    
    return null;
  }
}

/**
 * Test C-Sport scraper with credentials
 * @param {Object} credentials - Test credentials
 * @returns {Promise<Object|null>} Test result
 */
async function testScraper(credentials) {
  logger.info('Testing C-Sport scraper...');
  
  const result = await fetchOdds(credentials);
  
  if (result) {
    logger.info('C-Sport scraper test successful');
    logger.info(`Fetched ${result.matches.length} matches`);
  } else {
    logger.error('C-Sport scraper test failed');
  }
  
  return result;
}

module.exports = {
  fetchOdds,
  testScraper,
  CSPORT_CONFIG,
  performLogin,
};
