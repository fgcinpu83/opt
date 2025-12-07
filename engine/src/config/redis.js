// src/config/redis.js - Redis connection
const Redis = require('ioredis');
const logger = require('./logger');

let redisClient;
let redisPub;
let redisSub;

async function connectRedis() {
  try {
    // Extract password from REDIS_URL or use individual env variables
    const redisUrl = process.env.REDIS_URL;
    let redisPassword = process.env.REDIS_PASSWORD;
    
    // If REDIS_URL is in format redis://:PASSWORD@HOST:PORT, extract password
    if (redisUrl) {
      const passwordMatch = redisUrl.match(/:\/\/:(.*?)@/);
      if (passwordMatch && passwordMatch[1]) {
        redisPassword = passwordMatch[1];
        logger.info('Extracted Redis password from REDIS_URL');
      }
    }

    const redisConfig = {
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: redisPassword,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      enableOfflineQueue: true,
      lazyConnect: false
    };

    // Log config (without password)
    logger.info('Connecting to Redis', {
      host: redisConfig.host,
      port: redisConfig.port,
      hasPassword: !!redisConfig.password
    });

    // Main Redis client
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    // Pub/Sub clients
    redisPub = new Redis(redisConfig);
    redisSub = new Redis(redisConfig);

    // Test connection
    await redisClient.ping();
    logger.info('Redis PING successful');

    return { redisClient, redisPub, redisSub };
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis client closed');
  }
  if (redisPub) {
    await redisPub.quit();
  }
  if (redisSub) {
    await redisSub.quit();
  }
}

function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

function getRedisPub() {
  if (!redisPub) {
    throw new Error('Redis pub client not initialized.');
  }
  return redisPub;
}

function getRedisSub() {
  if (!redisSub) {
    throw new Error('Redis sub client not initialized.');
  }
  return redisSub;
}

// Export raw redis for direct access (e.g., health checks)
function getRedis() {
  return getRedisClient();
}

module.exports = {
  connectRedis,
  closeRedis,
  getRedisClient,
  getRedisPub,
  getRedisSub,
  getRedis,
  // Alias for backward compatibility
  ping: async () => {
    const client = getRedisClient();
    return await client.ping();
  },
  info: async (section) => {
    const client = getRedisClient();
    return await client.info(section);
  }
};
