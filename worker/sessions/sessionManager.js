/**
 * Session Manager
 * Handles browser sessions and authentication for providers
 */

const logger = require('../utils/logger');
const validators = require('../utils/validators');
const browserService = require('../services/browserService');
const { TIMEOUTS } = require('../config/constants');

const sessionManager = {
  // Store active sessions
  sessions: {},
  
  /**
   * Create a new session for a provider
   * @param {Object} provider - Provider configuration
   * @param {string} loginUrl - Login URL
   * @param {Object} credentials - Login credentials
   * @param {Object} proxyConfig - Optional proxy configuration
   * @returns {Promise<Object|null>} Session object or null on failure
   */
  async createSession(provider, loginUrl, credentials, proxyConfig = null) {
    try {
      if (!validators.isValidProvider(provider)) {
        logger.error('Invalid provider configuration');
        return null;
      }
      
      if (!validators.isValidCredentials(credentials)) {
        logger.error('Invalid credentials');
        return null;
      }
      
      logger.info(`Creating session for ${provider.name}`);
      
      // Launch browser
      const browser = await browserService.launchBrowser(proxyConfig);
      
      // Create context
      const context = await browserService.createContext(browser);
      
      // Create page
      const page = await browserService.createPage(context);
      
      // Navigate to login URL
      await browserService.goto(page, loginUrl);
      
      // Perform login (provider-specific logic)
      const loginSuccess = await this._performLogin(page, provider, credentials);
      
      if (!loginSuccess) {
        logger.error(`Login failed for ${provider.name}`);
        await browserService.closeBrowser(browser);
        return null;
      }
      
      // Store session
      const session = {
        provider: provider.id,
        browser,
        context,
        page,
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
      };
      
      this.sessions[provider.id] = session;
      
      logger.info(`Session created successfully for ${provider.name}`);
      return session;
    } catch (error) {
      logger.error(`Session creation failed for ${provider.name}`, error);
      return null;
    }
  },

  /**
   * Perform login for a specific provider
   * @private
   * @param {Page} page - Browser page
   * @param {Object} provider - Provider configuration
   * @param {Object} credentials - Login credentials
   * @returns {Promise<boolean>} True if login successful
   */
  async _performLogin(page, provider, credentials) {
    try {
      logger.debug(`Performing login for ${provider.name}`);
      
      // Provider-specific login logic would go here
      // This is a generic implementation that needs to be customized
      
      const { username, password } = credentials;
      
      // Wait for page to load
      await browserService.waitForLoadState(page, 'networkidle');
      
      // Generic login attempt (should be customized per provider)
      try {
        // Look for username/email field
        const usernameSelector = 'input[type="text"], input[type="email"], input[name*="user"], input[name*="email"]';
        await browserService.waitForSelector(page, usernameSelector, { timeout: 5000 });
        await browserService.fill(page, usernameSelector, username);
        
        // Look for password field
        const passwordSelector = 'input[type="password"]';
        await browserService.fill(page, passwordSelector, password);
        
        // Look for submit button
        const submitSelector = 'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")';
        await browserService.click(page, submitSelector);
        
        // Wait for navigation
        await page.waitForTimeout(TIMEOUTS.LOGIN);
        
        // Check if login was successful (generic check)
        const currentUrl = page.url();
        const isLoggedIn = !currentUrl.includes('login') && !currentUrl.includes('signin');
        
        return isLoggedIn;
      } catch (error) {
        logger.warn(`Generic login failed, may need provider-specific logic: ${error.message}`);
        return false;
      }
    } catch (error) {
      logger.error(`Login error for ${provider.name}`, error);
      return false;
    }
  },

  /**
   * Get an existing session
   * @param {string} providerId - Provider ID
   * @returns {Object|null} Session object or null if not found
   */
  getSession(providerId) {
    const session = this.sessions[providerId];
    
    if (!session) {
      logger.debug(`No session found for provider: ${providerId}`);
      return null;
    }
    
    if (!validators.isValidSession(session)) {
      logger.warn(`Invalid session for provider: ${providerId}`);
      delete this.sessions[providerId];
      return null;
    }
    
    // Update last activity
    session.lastActivity = new Date();
    
    return session;
  },

  /**
   * Close a specific session
   * @param {string} providerId - Provider ID
   * @returns {Promise<boolean>} True if session was closed
   */
  async closeSession(providerId) {
    try {
      const session = this.sessions[providerId];
      
      if (!session) {
        logger.debug(`No session to close for provider: ${providerId}`);
        return false;
      }
      
      logger.info(`Closing session for provider: ${providerId}`);
      
      // Close browser resources
      if (session.page) {
        await browserService.closePage(session.page);
      }
      
      if (session.context) {
        await browserService.closeContext(session.context);
      }
      
      if (session.browser) {
        await browserService.closeBrowser(session.browser);
      }
      
      // Remove from sessions
      delete this.sessions[providerId];
      
      logger.info(`Session closed for provider: ${providerId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to close session for ${providerId}`, error);
      delete this.sessions[providerId]; // Remove anyway to prevent memory leaks
      return false;
    }
  },

  /**
   * Close all sessions
   * @returns {Promise<number>} Number of sessions closed
   */
  async closeAllSessions() {
    logger.info('Closing all sessions...');
    
    const providerIds = Object.keys(this.sessions);
    let closedCount = 0;
    
    for (const providerId of providerIds) {
      const success = await this.closeSession(providerId);
      if (success) closedCount++;
    }
    
    logger.info(`Closed ${closedCount} sessions`);
    return closedCount;
  },

  /**
   * Check if a session exists and is active
   * @param {string} providerId - Provider ID
   * @returns {boolean} True if session exists and is active
   */
  hasActiveSession(providerId) {
    const session = this.getSession(providerId);
    return session !== null && session.isActive;
  },

  /**
   * Refresh a session (close and recreate)
   * @param {string} providerId - Provider ID
   * @param {Object} provider - Provider configuration
   * @param {string} loginUrl - Login URL
   * @param {Object} credentials - Login credentials
   * @param {Object} proxyConfig - Optional proxy configuration
   * @returns {Promise<Object|null>} New session or null
   */
  async refreshSession(providerId, provider, loginUrl, credentials, proxyConfig = null) {
    logger.info(`Refreshing session for ${providerId}`);
    
    // Close existing session
    await this.closeSession(providerId);
    
    // Create new session
    return await this.createSession(provider, loginUrl, credentials, proxyConfig);
  },

  /**
   * Get all active sessions
   * @returns {Array<Object>} Array of session info objects
   */
  getAllSessions() {
    return Object.entries(this.sessions).map(([providerId, session]) => ({
      providerId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isActive: session.isActive,
      uptime: new Date() - session.createdAt,
    }));
  },

  /**
   * Get session count
   * @returns {number} Number of active sessions
   */
  getSessionCount() {
    return Object.keys(this.sessions).length;
  },

  /**
   * Clean up inactive sessions (older than specified age)
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Promise<number>} Number of sessions cleaned up
   */
  async cleanupInactiveSessions(maxAge = 3600000) { // Default: 1 hour
    logger.info('Cleaning up inactive sessions...');
    
    const now = new Date();
    const providerIds = Object.keys(this.sessions);
    let cleanedCount = 0;
    
    for (const providerId of providerIds) {
      const session = this.sessions[providerId];
      const age = now - session.lastActivity;
      
      if (age > maxAge) {
        logger.info(`Session ${providerId} is inactive (age: ${age}ms), closing...`);
        const success = await this.closeSession(providerId);
        if (success) cleanedCount++;
      }
    }
    
    logger.info(`Cleaned up ${cleanedCount} inactive sessions`);
    return cleanedCount;
  },

  /**
   * Mark a session as inactive
   * @param {string} providerId - Provider ID
   */
  markSessionInactive(providerId) {
    const session = this.sessions[providerId];
    if (session) {
      session.isActive = false;
      logger.debug(`Session ${providerId} marked as inactive`);
    }
  },

  /**
   * Mark a session as active
   * @param {string} providerId - Provider ID
   */
  markSessionActive(providerId) {
    const session = this.sessions[providerId];
    if (session) {
      session.isActive = true;
      session.lastActivity = new Date();
      logger.debug(`Session ${providerId} marked as active`);
    }
  },
};

module.exports = sessionManager;
