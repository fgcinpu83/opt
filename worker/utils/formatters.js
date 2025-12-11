/**
 * Formatters Utility
 * Centralized data transformation and formatting functions
 */

const formatters = {
  /**
   * Format date to ISO string
   * @param {Date|string|number} date - Date to format
   * @returns {string} ISO formatted date string
   */
  formatDate: (date) => {
    try {
      return new Date(date).toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  },

  /**
   * Format date to human-readable string
   * @param {Date|string|number} date - Date to format
   * @returns {string} Human-readable date string
   */
  formatDateHuman: (date) => {
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  },

  /**
   * Format odds to fixed decimal places
   * @param {Object} odds - Odds object with home, draw, away
   * @param {number} decimals - Number of decimal places (default: 2)
   * @returns {Object} Formatted odds object
   */
  formatOdds: (odds, decimals = 2) => {
    if (!odds) return null;
    
    return {
      home: parseFloat(odds.home).toFixed(decimals),
      draw: parseFloat(odds.draw).toFixed(decimals),
      away: parseFloat(odds.away).toFixed(decimals),
    };
  },

  /**
   * Format currency amount
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code (default: 'USD')
   * @param {number} decimals - Number of decimal places (default: 2)
   * @returns {string} Formatted currency string
   */
  formatCurrency: (amount, currency = 'USD', decimals = 2) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return `${currency} 0.00`;
    
    return `${currency} ${num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  },

  /**
   * Format percentage
   * @param {number} value - Value to format as percentage
   * @param {number} decimals - Number of decimal places (default: 2)
   * @returns {string} Formatted percentage string
   */
  formatPercentage: (value, decimals = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00%';
    
    return `${num.toFixed(decimals)}%`;
  },

  /**
   * Format number with thousand separators
   * @param {number} num - Number to format
   * @param {number} decimals - Number of decimal places (default: 0)
   * @returns {string} Formatted number string
   */
  formatNumber: (num, decimals = 0) => {
    const number = parseFloat(num);
    if (isNaN(number)) return '0';
    
    return number.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  /**
   * Format duration in milliseconds to human-readable string
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Human-readable duration string
   */
  formatDuration: (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
  },

  /**
   * Format bytes to human-readable size
   * @param {number} bytes - Size in bytes
   * @returns {string} Human-readable size string
   */
  formatBytes: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  },

  /**
   * Format object to JSON string with indentation
   * @param {Object} obj - Object to format
   * @param {number} indent - Indentation spaces (default: 2)
   * @returns {string} Formatted JSON string
   */
  formatJSON: (obj, indent = 2) => {
    try {
      return JSON.stringify(obj, null, indent);
    } catch (error) {
      return '{}';
    }
  },

  /**
   * Format provider info for logging
   * @param {Object} provider - Provider object
   * @returns {string} Formatted provider string
   */
  formatProvider: (provider) => {
    if (!provider) return 'Unknown Provider';
    return `${provider.name} (${provider.id})`;
  },

  /**
   * Truncate string to specified length
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length
   * @param {string} suffix - Suffix to add if truncated (default: '...')
   * @returns {string} Truncated string
   */
  truncate: (str, maxLength, suffix = '...') => {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
  },

  /**
   * Format error for logging
   * @param {Error} error - Error object
   * @returns {Object} Formatted error object
   */
  formatError: (error) => {
    if (!error) return { message: 'Unknown error' };
    
    return {
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN',
      stack: error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : null,
    };
  },

  /**
   * Format URL with parameters
   * @param {string} baseUrl - Base URL
   * @param {Object} params - Query parameters
   * @returns {string} Formatted URL with parameters
   */
  formatUrl: (baseUrl, params = {}) => {
    if (!params || Object.keys(params).length === 0) return baseUrl;
    
    const queryString = Object.entries(params)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  },
};

module.exports = formatters;
