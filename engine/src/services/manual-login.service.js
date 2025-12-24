// src/services/manual-login.service.js - Manual login via Playwright
const { chromium } = require('playwright');
const logger = require('../config/logger');
const db = require('../config/database');
const { captureEndpoints, saveEndpointProfile, validateEndpointProfile } = require('./endpoint-capture.service');

// Store active browser contexts
const activeBrowsers = new Map();

/**
 * Generate manual login URL for user to authenticate
 * @param {Object} account - Account details
 * @returns {Promise<Object>} Login session info
 */
async function initiateManualLogin(account) {
  const { id, sportsbook, url, username } = account;
  
  logger.info('Initiating manual login', { account_id: id, sportsbook, username });

  try {
    // Launch browser in headed mode for manual login
    const browser = await chromium.launch({
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    });

    // Create isolated browser context for this account
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'Asia/Singapore'
    });

    const page = await context.newPage();

    // Navigate to sportsbook login page
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    logger.info('Browser opened for manual login', { account_id: id, url });

    // Store browser reference
    activeBrowsers.set(id, {
      browser,
      context,
      page,
      account,
      status: 'waiting_login',
      created_at: new Date()
    });

    // Return login session info
    return {
      account_id: id,
      status: 'browser_opened',
      message: 'Please login manually in the browser window',
      sportsbook,
      username
    };

  } catch (error) {
    logger.error('Failed to initiate manual login', { error: error.message, account_id: id });
    throw error;
  }
}

/**
 * Check if user has completed manual login and capture endpoints
 * @param {number} accountId - Account ID
 * @returns {Promise<Object>} Authentication status
 */
async function checkAuthenticationStatus(accountId) {
  const session = activeBrowsers.get(accountId);
  
  if (!session) {
    return {
      authenticated: false,
      status: 'no_session',
      message: 'No active browser session found'
    };
  }

  const { page, account } = session;

  try {
    // Check if user is authenticated (customize this based on sportsbook)
    // Common indicators: presence of balance, user menu, logout button, etc.
    const isAuthenticated = await checkPageAuthentication(page, account.sportsbook);

    if (isAuthenticated) {
      logger.info('User authenticated successfully', { account_id: accountId });

      // Update session status
      session.status = 'authenticated';
      activeBrowsers.set(accountId, session);

      // Start endpoint capture
      logger.info('Starting endpoint capture', { account_id: accountId });
      
      const endpointData = await captureEndpoints(page, {
        whitelabel: account.sportsbook.toLowerCase(),
        provider: account.sportsbook,
        timeout: 30000
      });

      // Validate captured endpoints
      const isValid = validateEndpointProfile(endpointData);

      if (isValid) {
        // Save endpoint profile to Redis
        await saveEndpointProfile(
          account.sportsbook.toLowerCase(),
          account.sportsbook,
          'PRIVATE',
          endpointData
        );

        // Update account status in database
        await db.query(
          'UPDATE sportsbook_accounts SET status = $1, last_checked = NOW() WHERE id = $2',
          ['online', accountId]
        );

        logger.info('Authentication and endpoint capture complete', { account_id: accountId });

        return {
          authenticated: true,
          status: 'ready',
          message: 'Authentication successful, endpoints captured',
          endpoint_profile: endpointData
        };
      } else {
        logger.warn('Endpoint validation failed', { account_id: accountId });
        return {
          authenticated: true,
          status: 'incomplete',
          message: 'Authentication successful but endpoint capture incomplete'
        };
      }

    } else {
      return {
        authenticated: false,
        status: 'waiting_login',
        message: 'Waiting for manual login'
      };
    }

  } catch (error) {
    logger.error('Error checking authentication status', { error: error.message, account_id: accountId });
    return {
      authenticated: false,
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Check if page is authenticated based on sportsbook-specific indicators
 * @param {Page} page - Playwright page
 * @param {string} sportsbook - Sportsbook name
 * @returns {Promise<boolean>}
 */
async function checkPageAuthentication(page, sportsbook) {
  try {
    // Generic authentication checks (customize per sportsbook)
    const checks = [
      // Check for common authenticated elements
      page.locator('[class*="balance"]').first().isVisible().catch(() => false),
      page.locator('[class*="user"]').first().isVisible().catch(() => false),
      page.locator('[class*="logout"]').first().isVisible().catch(() => false),
      page.locator('[href*="logout"]').first().isVisible().catch(() => false),
      page.locator('[id*="balance"]').first().isVisible().catch(() => false),
    ];

    const results = await Promise.all(checks);
    const isAuthenticated = results.some(result => result === true);

    // Additional check: ensure we're not on login page
    const currentUrl = page.url();
    const isNotLoginPage = !currentUrl.includes('login') && 
                           !currentUrl.includes('signin') && 
                           !currentUrl.includes('auth');

    return isAuthenticated && isNotLoginPage;

  } catch (error) {
    logger.error('Error checking page authentication', { error: error.message });
    return false;
  }
}

/**
 * Close browser session for account
 * @param {number} accountId - Account ID
 */
async function closeBrowserSession(accountId) {
  const session = activeBrowsers.get(accountId);
  
  if (session) {
    try {
      await session.context.close();
      await session.browser.close();
      activeBrowsers.delete(accountId);
      logger.info('Browser session closed', { account_id: accountId });
    } catch (error) {
      logger.error('Error closing browser session', { error: error.message, account_id: accountId });
    }
  }
}

/**
 * Get all active browser sessions
 * @returns {Array} List of active sessions
 */
function getActiveSessions() {
  const sessions = [];
  activeBrowsers.forEach((session, accountId) => {
    sessions.push({
      account_id: accountId,
      sportsbook: session.account.sportsbook,
      status: session.status,
      created_at: session.created_at
    });
  });
  return sessions;
}

module.exports = {
  initiateManualLogin,
  checkAuthenticationStatus,
  closeBrowserSession,
  getActiveSessions
};
