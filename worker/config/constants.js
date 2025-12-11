/**
 * Worker Configuration Constants
 * Centralized configuration and constant values
 */

module.exports = {
  // Timeout configurations (in milliseconds)
  TIMEOUTS: {
    LOGIN: 30000,
    FETCH: 20000,
    SCREENSHOT: 5000,
    NAVIGATION: 15000,
    NETWORK_IDLE: 10000,
    DEFAULT: 5000,
  },

  // Retry configurations
  RETRIES: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000,
    BACKOFF_MULTIPLIER: 2,
  },

  // API URLs
  URLS: {
    BOT: process.env.BOT_URL || 'http://localhost:3001',
    ENGINE: process.env.ENGINE_URL || 'http://localhost:3000',
  },

  // Proxy configurations
  PROXY: {
    TIMEOUT: 5000,
    ROTATION_ENABLED: true,
  },

  // Browser launch options
  BROWSER_OPTIONS: {
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
    ],
  },

  // Browser context options
  CONTEXT_OPTIONS: {
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  // Provider configurations (example - to be populated)
  PROVIDERS: [
    // Will be populated from external configuration or environment
  ],

  // Worker settings
  WORKER: {
    POLL_INTERVAL: 5000,
    MAX_CONCURRENT_JOBS: 3,
    HEARTBEAT_INTERVAL: 30000,
  },

  // Logging levels
  LOG_LEVELS: {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
  },
};
