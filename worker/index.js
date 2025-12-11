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

// Provider configurations (to be loaded from environment or config file)
const PROVIDERS = [
  // Example provider configuration
  // {
  //   id: 'provider1',
  //   name: 'Provider 1',
  //   loginUrl: 'https://provider1.com/login',
  //   oddsUrl: 'https://provider1.com/odds',
  //   credentials: {
  //     username: process.env.PROVIDER1_USER,
  //     password: process.env.PROVIDER1_PASS,
  //   },
  // },
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
    
    // Get or create session
    let session = sessionManager.getSession(provider.id);
    
    if (!session) {
      logger.info(`No existing session for ${provider.name}, creating new one...`);
      
      // Get proxy if available
      const proxy = proxyService.getNextProxy();
      const proxyConfig = proxyService.formatProxyForPlaywright(proxy);
      
      // Create new session
      session = await sessionManager.createSession(
        provider,
        provider.loginUrl,
        provider.credentials,
        proxyConfig
      );
      
      if (!session) {
        logger.error(`Failed to create session for ${provider.name}`);
        return;
      }
    }
    
    // Fetch odds for this provider
    // This is a placeholder - actual implementation would scrape the provider's site
    logger.info(`Fetching odds from ${provider.name}...`);
    
    // Example: Navigate to odds page and extract data
    // const oddsData = await extractOddsFromProvider(session, provider);
    
    logger.info(`Successfully processed ${provider.name}`);
  } catch (error) {
    logger.error(`Error processing provider ${provider.name}`, error);
    
    // Mark session as inactive on error
    sessionManager.markSessionInactive(provider.id);
  }
}

/**
 * Main worker loop
 */
async function mainLoop() {
  try {
    logger.debug('Starting main loop iteration');
    
    // Fetch current odds from bot API
    const oddsData = await oddsService.fetchOdds(URLS.BOT);
    
    if (oddsData) {
      logger.info('Received odds data from bot API');
      // Process odds data here
    }
    
    // Process each provider
    for (const provider of PROVIDERS) {
      await processProvider(provider);
      
      // Small delay between providers
      await sleep(1000);
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
