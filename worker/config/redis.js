/**
 * Redis Configuration
 * Handles Redis connection for session storage
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

/**
 * Initialize Redis connection
 * @returns {Redis} Redis client instance
 */
function initializeRedis() {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  logger.info(`Connecting to Redis: ${redisUrl.replace(/:[^:]*@/, ':***@')}`);
  
  redisClient = new Redis(redisUrl, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  // Handle Redis events
  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis client error', err);
  });

  redisClient.on('close', () => {
    logger.warn('Redis client connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.info('Redis client reconnecting...');
  });

  return redisClient;
}

/**
 * Get Redis client instance
 * @returns {Redis} Redis client
 */
function getRedisClient() {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

/**
 * Close Redis connection
 * @returns {Promise<void>}
 */
async function closeRedis() {
  if (redisClient) {
    logger.info('Closing Redis connection...');
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Test Redis connection
 * @returns {Promise<boolean>} True if connection is working
 */
async function testConnection() {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis connection test failed', error);
    return false;
  }
}

module.exports = {
  initializeRedis,
  getRedisClient,
  closeRedis,
  testConnection,
  get redisClient() {
    return getRedisClient();
  },
};
