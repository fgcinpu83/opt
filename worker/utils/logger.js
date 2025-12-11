/**
 * Logger Utility
 * Centralized logging with timestamps and log levels
 */

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

/**
 * Format timestamp for logging
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Format log message with timestamp and level
 */
function formatMessage(level, message) {
  return `[${getTimestamp()}] ${level}: ${message}`;
}

/**
 * Logger object with different log levels
 */
const logger = {
  /**
   * Log debug messages
   * @param {string} message - The message to log
   * @param {Object} data - Optional data object to include
   */
  debug: (message, data = null) => {
    const formattedMsg = formatMessage(LOG_LEVELS.DEBUG, message);
    if (data) {
      console.log(formattedMsg, data);
    } else {
      console.log(formattedMsg);
    }
  },

  /**
   * Log info messages
   * @param {string} message - The message to log
   * @param {Object} data - Optional data object to include
   */
  info: (message, data = null) => {
    const formattedMsg = formatMessage(LOG_LEVELS.INFO, message);
    if (data) {
      console.log(formattedMsg, data);
    } else {
      console.log(formattedMsg);
    }
  },

  /**
   * Log warning messages
   * @param {string} message - The message to log
   * @param {Object} data - Optional data object to include
   */
  warn: (message, data = null) => {
    const formattedMsg = formatMessage(LOG_LEVELS.WARN, message);
    if (data) {
      console.warn(formattedMsg, data);
    } else {
      console.warn(formattedMsg);
    }
  },

  /**
   * Log error messages
   * @param {string} message - The message to log
   * @param {Error|Object} error - Optional error object or data
   */
  error: (message, error = null) => {
    const formattedMsg = formatMessage(LOG_LEVELS.ERROR, message);
    if (error) {
      console.error(formattedMsg, error);
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
    } else {
      console.error(formattedMsg);
    }
  },

  /**
   * Log with custom level
   * @param {string} level - Custom log level
   * @param {string} message - The message to log
   * @param {Object} data - Optional data object
   */
  log: (level, message, data = null) => {
    const formattedMsg = formatMessage(level.toUpperCase(), message);
    if (data) {
      console.log(formattedMsg, data);
    } else {
      console.log(formattedMsg);
    }
  },
};

module.exports = logger;
