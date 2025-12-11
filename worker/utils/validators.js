/**
 * Validators Utility
 * Centralized validation logic for data integrity
 */

const validators = {
  /**
   * Validate provider object
   * @param {Object} provider - Provider object to validate
   * @returns {boolean} True if valid, false otherwise
   */
  isValidProvider: (provider) => {
    if (!provider || typeof provider !== 'object') {
      return false;
    }
    return !!(provider.id && provider.name);
  },

  /**
   * Validate odds object
   * @param {Object} odds - Odds object to validate
   * @returns {boolean} True if valid, false otherwise
   */
  isValidOdds: (odds) => {
    if (!odds || typeof odds !== 'object') {
      return false;
    }
    return !!(
      odds.home &&
      odds.draw &&
      odds.away &&
      !isNaN(parseFloat(odds.home)) &&
      !isNaN(parseFloat(odds.draw)) &&
      !isNaN(parseFloat(odds.away))
    );
  },

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid URL, false otherwise
   */
  isValidUrl: (url) => {
    if (!url || typeof url !== 'string') {
      return false;
    }
    return url.startsWith('http://') || url.startsWith('https://');
  },

  /**
   * Validate proxy configuration
   * @param {Object} proxy - Proxy object to validate
   * @returns {boolean} True if valid, false otherwise
   */
  isValidProxy: (proxy) => {
    if (!proxy || typeof proxy !== 'object') {
      return false;
    }
    return !!(proxy.server && validators.isValidUrl(proxy.server));
  },

  /**
   * Validate credentials
   * @param {Object} credentials - Credentials object to validate
   * @returns {boolean} True if valid, false otherwise
   */
  isValidCredentials: (credentials) => {
    if (!credentials || typeof credentials !== 'object') {
      return false;
    }
    return !!(credentials.username && credentials.password);
  },

  /**
   * Validate job payload
   * @param {Object} job - Job object to validate
   * @returns {boolean} True if valid, false otherwise
   */
  isValidJob: (job) => {
    if (!job || typeof job !== 'object') {
      return false;
    }
    return !!(job.id && job.type);
  },

  /**
   * Validate session object
   * @param {Object} session - Session object to validate
   * @returns {boolean} True if valid, false otherwise
   */
  isValidSession: (session) => {
    if (!session || typeof session !== 'object') {
      return false;
    }
    return !!(session.browser && session.page);
  },

  /**
   * Validate number within range
   * @param {number} value - Value to validate
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {boolean} True if within range, false otherwise
   */
  isInRange: (value, min, max) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  },

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email, false otherwise
   */
  isValidEmail: (email) => {
    if (!email || typeof email !== 'string') {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate non-empty string
   * @param {string} str - String to validate
   * @returns {boolean} True if non-empty string, false otherwise
   */
  isNonEmptyString: (str) => {
    return typeof str === 'string' && str.trim().length > 0;
  },

  /**
   * Validate array with minimum length
   * @param {Array} arr - Array to validate
   * @param {number} minLength - Minimum required length
   * @returns {boolean} True if valid array with minimum length, false otherwise
   */
  isValidArray: (arr, minLength = 1) => {
    return Array.isArray(arr) && arr.length >= minLength;
  },
};

module.exports = validators;
