/**
 * Session Manager
 * Handles browser sessions and authentication for providers
 * Uses Redis for session storage and sharing between workers
 */

const logger = require('../utils/logger');
const validators = require('../utils/validators');
const browserService = require('../services/browserService');
const { TIMEOUTS } = require('../config/constants');
const { redisClient } = require('../config/redis');

const sessionManager = {
  // Store active sessions (local cache)
  sessions: {},
  
  // Redis session TTL (10 minutes)
  SESSION_TTL: 600,
  
  /**
   * Get session key for Redis
   * @param {string} provider - Provider name (e.g., 'qq188', 'csport')
   * @param {string} username - Username
   * @returns {string} Redis key
   */
  getSessionKey(provider, username) {
    return `session:${provider}:${username}`;
  },

  /**
   * Get lock key for Redis (prevent concurrent login)
   * @param {string} provider - Provider name
   * @param {string} username - Username
   * @returns {string} Redis lock key
   */
  getLockKey(provider, username) {
    return `lock:${provider}:${username}`;
  },

  /**
   * Acquire lock for session creation
   * @param {string} provider - Provider name
   * @param {string} username - Username
   * @returns {Promise<boolean>} True if lock acquired
   */
  async acquireLock(provider, username) {
    try {
      const lockKey = this.getLockKey(provider, username);
      const result = await redisClient.set(lockKey, '1', 'EX', 30, 'NX');
      return result === 'OK';
    } catch (error) {
      logger.error('Failed to acquire lock', error);
      return false;
    }
  },

  /**
   * Release lock for session creation
   * @param {string} provider - Provider name
   * @param {string} username - Username
   * @returns {Promise<void>}
   */
  async releaseLock(provider, username) {
    try {
      const lockKey = this.getLockKey(provider, username);
      await redisClient.del(lockKey);
    } catch (error) {
      logger.error('Failed to release lock', error);
    }
  },

  /**
   * Store session in Redis
   * @param {string} provider - Provider name
   * @param {string} username - Username
   * @param {Object} sessionData - Session data (cookies, tokens, etc.)
   * @returns {Promise<boolean>} True if successful
   */
  async storeSession(provider, username, sessionData) {
    try {
      const sessionKey = this.getSessionKey(provider, username);
      const data = JSON.stringify({
        ...sessionData,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      });
      
      await redisClient.setex(sessionKey, this.SESSION_TTL, data);
      logger.info(`Session stored in Redis: ${sessionKey}`);
      return true;
    } catch (error) {
      logger.error('Failed to store session in Redis', error);
      return false;
    }
  },

  /**
   * Retrieve session from Redis
   * @param {string} provider - Provider name
   * @param {string} username - Username
   * @returns {Promise<Object|null>} Session data or null
   */
  async retrieveSession(provider, username) {
    try {
      const sessionKey = this.getSessionKey(provider, username);
      const data = await redisClient.get(sessionKey);
      
      if (!data) {
        logger.debug(`No session found in Redis: ${sessionKey}`);
        return null;
      }
      
      const session = JSON.parse(data);
      
      // Update last activity
      session.lastActivity = new Date().toISOString();
      await redisClient.setex(sessionKey, this.SESSION_TTL, JSON.stringify(session));
      
      logger.debug(`Session retrieved from Redis: ${sessionKey}`);
      return session;
    } catch (error) {
      logger.error('Failed to retrieve session from Redis', error);
      return null;
    }
  },

  /**
   * Validate session (check if cookies are still valid)
   * @param {Object} sessionData - Session data with cookies
   * @returns {boolean} True if session appears valid
   */
  validateSession(sessionData) {
    if (!sessionData || !sessionData.cookies) {
      return false;
    }
    
    // Check if session has required cookies
    const cookies = sessionData.cookies;
    if (!Array.isArray(cookies) || cookies.length === 0) {
      return false;
    }
    
    // Check if cookies are not expired
    const now = Date.now() / 1000; // Unix timestamp in seconds
    const validCookies = cookies.filter(cookie => {
      if (cookie.expires && cookie.expires < now) {
        return false;
      }
      return true;
    });
    
    return validCookies.length > 0;
  },

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
      
      const { username } = credentials;
      
      // Try to acquire lock to prevent concurrent login
      const lockAcquired = await this.acquireLock(provider.id, username);
      if (!lockAcquired) {
        logger.warn(`Could not acquire lock for ${provider.name}:${username}, another worker may be creating session`);
        // Wait a bit and try to retrieve session
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await this.getOrCreateSession(provider, loginUrl, credentials, proxyConfig);
      }
      
      try {
        logger.info(`Creating session for ${provider.name}:${username}`);
        
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
        
        // Extract cookies after successful login
        const cookies = await context.cookies();
        
        // Store session in Redis
        const sessionData = {
          provider: provider.id,
          username,
          cookies,
        };
        
        await this.storeSession(provider.id, username, sessionData);
        
        // Store local session (with browser references)
        const session = {
          provider: provider.id,
          username,
          browser,
          context,
          page,
          cookies,
          createdAt: new Date(),
          lastActivity: new Date(),
          isActive: true,
        };
        
        this.sessions[provider.id] = session;
        
        logger.info(`Session created successfully for ${provider.name}:${username}`);
        return session;
      } finally {
        // Always release lock
        await this.releaseLock(provider.id, username);
      }
    } catch (error) {
      logger.error(`Session creation failed for ${provider.name}`, error);
      return null;
    }
  },

  /**
   * Get or create session (check Redis first)
   * @param {Object} provider - Provider configuration
   * @param {string} loginUrl - Login URL
   * @param {Object} credentials - Login credentials
   * @param {Object} proxyConfig - Optional proxy configuration
   * @returns {Promise<Object|null>} Session object or null on failure
   */
  async getOrCreateSession(provider, loginUrl, credentials, proxyConfig = null) {
    try {
      const { username } = credentials;
      
      // Check Redis first
      const redisSession = await this.retrieveSession(provider.id, username);
      
      if (redisSession && this.validateSession(redisSession)) {
        logger.info(`Using existing session from Redis for ${provider.name}:${username}`);
        return redisSession;
      }
      
      // No valid session in Redis, create new one
      logger.info(`No valid session in Redis, creating new session for ${provider.name}:${username}`);
      return await this.createSession(provider, loginUrl, credentials, proxyConfig);
    } catch (error) {
      logger.error(`Failed to get or create session for ${provider.name}`, error);
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
