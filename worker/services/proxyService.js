/**
 * Proxy Service
 * Handles proxy rotation and management
 */

const logger = require('../utils/logger');
const validators = require('../utils/validators');

const proxyService = {
  // Internal state
  proxyList: [],
  currentIndex: 0,
  failedProxies: new Set(),
  proxyStats: new Map(),

  /**
   * Initialize proxy service with a list of proxies
   * @param {Array<Object|string>} proxies - Array of proxy configurations
   */
  setProxies(proxies) {
    if (!Array.isArray(proxies)) {
      logger.warn('Invalid proxy list provided, using empty list');
      this.proxyList = [];
      return;
    }

    this.proxyList = proxies.filter((proxy) => {
      // Handle both string URLs and proxy objects
      if (typeof proxy === 'string') {
        return validators.isValidUrl(proxy);
      }
      return validators.isValidProxy(proxy);
    });

    this.currentIndex = 0;
    this.failedProxies.clear();
    this.proxyStats.clear();

    // Initialize stats for each proxy
    this.proxyList.forEach((proxy, index) => {
      this.proxyStats.set(index, {
        requests: 0,
        failures: 0,
        lastUsed: null,
        avgResponseTime: 0,
      });
    });

    logger.info(`Loaded ${this.proxyList.length} proxies`);
  },

  /**
   * Get the next proxy in rotation
   * @returns {Object|string|null} Next proxy configuration or null if none available
   */
  getNextProxy() {
    if (this.proxyList.length === 0) {
      logger.warn('No proxies available');
      return null;
    }

    // Try to find a working proxy
    let attempts = 0;
    const maxAttempts = this.proxyList.length;

    while (attempts < maxAttempts) {
      const proxy = this.proxyList[this.currentIndex];
      const proxyKey = this.currentIndex;

      // Move to next index
      this.currentIndex = (this.currentIndex + 1) % this.proxyList.length;
      attempts++;

      // Skip failed proxies
      if (this.failedProxies.has(proxyKey)) {
        continue;
      }

      // Update stats
      const stats = this.proxyStats.get(proxyKey);
      if (stats) {
        stats.requests++;
        stats.lastUsed = new Date();
      }

      logger.debug(`Using proxy ${proxyKey + 1}/${this.proxyList.length}`);
      return proxy;
    }

    logger.warn('All proxies have failed, resetting failure list');
    this.failedProxies.clear();
    return this.getNextProxy();
  },

  /**
   * Get current proxy without rotating
   * @returns {Object|string|null} Current proxy or null
   */
  getCurrentProxy() {
    if (this.proxyList.length === 0) {
      return null;
    }
    return this.proxyList[this.currentIndex] || null;
  },

  /**
   * Mark a proxy as failed
   * @param {number} proxyIndex - Index of the failed proxy
   */
  markProxyFailed(proxyIndex) {
    if (proxyIndex >= 0 && proxyIndex < this.proxyList.length) {
      this.failedProxies.add(proxyIndex);
      
      const stats = this.proxyStats.get(proxyIndex);
      if (stats) {
        stats.failures++;
      }

      logger.warn(`Proxy ${proxyIndex + 1} marked as failed`);
    }
  },

  /**
   * Mark current proxy as failed and get next one
   * @returns {Object|string|null} Next proxy or null
   */
  rotateOnFailure() {
    const failedIndex = (this.currentIndex - 1 + this.proxyList.length) % this.proxyList.length;
    this.markProxyFailed(failedIndex);
    return this.getNextProxy();
  },

  /**
   * Reset all proxy failure states
   */
  resetFailures() {
    this.failedProxies.clear();
    logger.info('Proxy failure states reset');
  },

  /**
   * Get proxy statistics
   * @returns {Array<Object>} Array of proxy stats
   */
  getProxyStats() {
    const stats = [];
    
    for (let i = 0; i < this.proxyList.length; i++) {
      const proxy = this.proxyList[i];
      const proxyStats = this.proxyStats.get(i) || {};
      
      stats.push({
        index: i,
        proxy: typeof proxy === 'string' ? proxy : proxy.server,
        isFailed: this.failedProxies.has(i),
        ...proxyStats,
      });
    }
    
    return stats;
  },

  /**
   * Get count of available (non-failed) proxies
   * @returns {number} Count of available proxies
   */
  getAvailableProxyCount() {
    return this.proxyList.length - this.failedProxies.size;
  },

  /**
   * Get total proxy count
   * @returns {number} Total number of proxies
   */
  getTotalProxyCount() {
    return this.proxyList.length;
  },

  /**
   * Check if proxy service has any proxies
   * @returns {boolean} True if proxies are available
   */
  hasProxies() {
    return this.proxyList.length > 0;
  },

  /**
   * Format proxy for Playwright
   * @param {Object|string} proxy - Proxy configuration
   * @returns {Object|null} Formatted proxy object for Playwright
   */
  formatProxyForPlaywright(proxy) {
    if (!proxy) return null;

    // If already an object with server property, return as-is
    if (typeof proxy === 'object' && proxy.server) {
      return {
        server: proxy.server,
        username: proxy.username || undefined,
        password: proxy.password || undefined,
      };
    }

    // If string URL, convert to object
    if (typeof proxy === 'string') {
      return {
        server: proxy,
      };
    }

    return null;
  },

  /**
   * Update proxy response time
   * @param {number} proxyIndex - Index of the proxy
   * @param {number} responseTime - Response time in milliseconds
   */
  updateResponseTime(proxyIndex, responseTime) {
    const stats = this.proxyStats.get(proxyIndex);
    if (stats) {
      // Calculate running average
      const totalRequests = stats.requests;
      const currentAvg = stats.avgResponseTime;
      stats.avgResponseTime = (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
    }
  },

  /**
   * Get best performing proxy (lowest avg response time)
   * @returns {Object|string|null} Best proxy or null
   */
  getBestProxy() {
    if (this.proxyList.length === 0) return null;

    let bestIndex = 0;
    let bestAvgTime = Infinity;

    for (let i = 0; i < this.proxyList.length; i++) {
      if (this.failedProxies.has(i)) continue;

      const stats = this.proxyStats.get(i);
      if (stats && stats.avgResponseTime < bestAvgTime && stats.requests > 0) {
        bestAvgTime = stats.avgResponseTime;
        bestIndex = i;
      }
    }

    return this.proxyList[bestIndex];
  },

  /**
   * Clear all proxies
   */
  clearProxies() {
    this.proxyList = [];
    this.currentIndex = 0;
    this.failedProxies.clear();
    this.proxyStats.clear();
    logger.info('All proxies cleared');
  },
};

module.exports = proxyService;
