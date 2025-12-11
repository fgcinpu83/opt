/**
 * Worker Entry Point
 * Main orchestration for the arbitrage bot worker
 */

const logger = require('./utils/logger');
const proxyService = require('./services/proxyService');
const sessionManager = require('./sessions/sessionManager');
const oddsService = require('./services/oddsService');
const browserService = require('./services/browserService');
const { TIMEOUTS, URLS, RETRIES, WORKER } = require('./config/constants');
const { initializeRedis, closeRedis, testConnection } = require('./config/redis');
const csportScraper = require('./scrapers/csport');

// Provider configurations (to be loaded from environment or config file)
const PROVIDERS = [
  // C-Sport via QQ188
  {
    id: 'qq188',
    name: 'QQ188 C-Sport',
    type: 'csport',
    loginUrl: 'https://mylv.5336267.com/Member/Login',
    oddsUrl: 'https://mylv.5336267.com/Member/BetsView/BetLight/DataOdds.ashx',
    credentials: {
      username: process.env.QQ188_USERNAME || '',
      password: process.env.QQ188_PASSWORD || '',
    },
    scraper: csportScraper,
  },
  // Add more providers here
];

// Worker state
let isRunning = false;
let mainLoopInterval = null;

/**
 * Initialize the worker
 */
async function initialize() {
  try {
    logger.info('='.repeat(60));
    logger.info('Arbitrage Bot Worker - Starting');
    logger.info('='.repeat(60));
    
    // Load environment variables if needed
    require('dotenv').config();
    
    // Initialize Redis connection
    logger.info('Initializing Redis connection...');
    initializeRedis();
    
    // Test Redis connection
    const redisConnected = await testConnection();
    if (!redisConnected) {
      logger.error('Redis connection test failed!');
      return false;
    }
    logger.info('Redis connection successful');
    
    // Initialize proxy service
    const proxies = loadProxies();
    if (proxies.length > 0) {
      proxyService.setProxies(proxies);
      logger.info(`Initialized with ${proxies.length} proxies`);
    } else {
      logger.warn('No proxies configured, running without proxy');
    }
    
    // Initialize providers
    if (PROVIDERS.length === 0) {
      logger.warn('No providers configured. Please add providers to the configuration.');
    } else {
      logger.info(`Loaded ${PROVIDERS.length} providers`);
      for (const provider of PROVIDERS) {
        logger.info(`  - ${provider.name} (${provider.id})`);
        if (!provider.credentials.username || !provider.credentials.password) {
          logger.warn(`    WARNING: No credentials configured for ${provider.name}`);
        }
      }
    }
    
    logger.info('Worker initialization complete');
    return true;
  } catch (error) {
    logger.error('Worker initialization failed', error);
    return false;
  }
}

/**
 * Load proxies from environment or configuration
 * @returns {Array<string|Object>} Array of proxy configurations
 */
function loadProxies() {
  const proxies = [];
  
  // Load from environment variable (comma-separated list)
  const proxyEnv = process.env.PROXY_LIST;
  if (proxyEnv) {
    const proxyList = proxyEnv.split(',').map(p => p.trim()).filter(p => p);
    proxies.push(...proxyList);
  }
  
  // Or load individual proxy
  const proxyServer = process.env.PROXY_SERVER;
  if (proxyServer && !proxies.includes(proxyServer)) {
    const proxyConfig = {
      server: proxyServer,
      username: process.env.PROXY_USERNAME,
      password: process.env.PROXY_PASSWORD,
    };
    proxies.push(proxyConfig);
  }
  
  return proxies;
}

/**
 * Process a single provider
 * @param {Object} provider - Provider configuration
 */
async function processProvider(provider) {
  try {
    logger.info(`Processing provider: ${provider.name}`);
    
    // Check if provider has valid credentials
    if (!provider.credentials.username || !provider.credentials.password) {
      logger.warn(`Skipping ${provider.name} - no credentials configured`);
      return;
    }
    
    // Use provider-specific scraper if available
    if (provider.scraper && typeof provider.scraper.fetchOdds === 'function') {
      logger.info(`Using scraper for ${provider.name}...`);
      
      const oddsData = await provider.scraper.fetchOdds(provider.credentials);
      
      if (oddsData && oddsData.matches) {
        logger.info(`Successfully fetched ${oddsData.matches.length} matches from ${provider.name}`);
        
        // Send data to engine/backend for arbitrage detection
        await sendOddsToEngine(oddsData);
      } else {
        logger.warn(`No odds data received from ${provider.name}`);
      }
    } else {
      logger.warn(`No scraper configured for ${provider.name}`);
    }
    
    logger.info(`Successfully processed ${provider.name}`);
  } catch (error) {
    logger.error(`Error processing provider ${provider.name}`, error);
    
    // Mark session as inactive on error
    sessionManager.markSessionInactive(provider.id);
  }
}

/**
 * Send odds data to engine for arbitrage detection
 * @param {Object} oddsData - Standardized odds data
 */
async function sendOddsToEngine(oddsData) {
  try {
    logger.debug('Sending odds data to engine...');
    
    // Send to engine API (implementation depends on engine API)
    // For now, just log the data
    logger.info(`Odds data ready: ${oddsData.provider}, ${oddsData.matches.length} matches`);
    
    // TODO: Implement actual API call to engine
    // await axios.post(`${URLS.ENGINE}/odds`, oddsData);
  } catch (error) {
    logger.error('Failed to send odds data to engine', error);
  }
}

/**
 * Main worker loop
 */
async function mainLoop() {
  try {
    logger.debug('Starting main loop iteration');
    
    // Process each provider
    for (const provider of PROVIDERS) {
      await processProvider(provider);
      
      // Small delay between providers
      await sleep(2000);
    }
    
    // Clean up inactive sessions
    const inactiveAge = 30 * 60 * 1000; // 30 minutes
    await sessionManager.cleanupInactiveSessions(inactiveAge);
    
    logger.debug('Main loop iteration complete');
  } catch (error) {
    logger.error('Error in main loop', error);
  }
}

/**
 * Start the worker
 */
async function start() {
  if (isRunning) {
    logger.warn('Worker is already running');
    return;
  }
  
  const initialized = await initialize();
  
  if (!initialized) {
    logger.error('Failed to initialize worker');
    process.exit(1);
  }
  
  isRunning = true;
  logger.info('Worker started');
  
  // Start main loop
  logger.info(`Main loop will run every ${WORKER.POLL_INTERVAL}ms`);
  
  // Run immediately
  await mainLoop();
  
  // Then run on interval
  mainLoopInterval = setInterval(async () => {
    if (isRunning) {
      await mainLoop();
    }
  }, WORKER.POLL_INTERVAL);
}

/**
 * Stop the worker
 */
async function stop() {
  if (!isRunning) {
    logger.warn('Worker is not running');
    return;
  }
  
  logger.info('Stopping worker...');
  isRunning = false;
  
  // Clear interval
  if (mainLoopInterval) {
    clearInterval(mainLoopInterval);
    mainLoopInterval = null;
  }
  
  // Close all sessions
  await sessionManager.closeAllSessions();
  
  // Close Redis connection
  await closeRedis();
  
  logger.info('Worker stopped');
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  await stop();
  
  logger.info('Shutdown complete');
  process.exit(0);
}

/**
 * Utility: Sleep function
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle process signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});

// Main execution
if (require.main === module) {
  start().catch((error) => {
    logger.error('Worker failed to start', error);
    process.exit(1);
  });
}

// Export for testing or programmatic use
module.exports = {
  start,
  stop,
  initialize,
  processProvider,
};
