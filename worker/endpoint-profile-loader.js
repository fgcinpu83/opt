#!/usr/bin/env node
/**
 * Endpoint Profile Loader
 * Loads endpoint profiles into Redis with validation
 * Supports PUBLIC and PRIVATE endpoint profiles
 */

const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');
const { validateEndpointProfile } = require('./config/endpoint-profile-schema');

/**
 * Build Redis key for endpoint profile
 * Format: endpoint_profile:{whitelabel}:{provider}:{profile_type}
 * @param {Object} profile - Profile identity containing whitelabel, provider, profile_type
 * @returns {string} Redis key
 */
function buildRedisKey(profile) {
  const { whitelabel, provider, profile_type } = profile;
  
  if (!whitelabel || !provider || !profile_type) {
    throw new Error('Profile must have whitelabel, provider, and profile_type');
  }
  
  return `endpoint_profile:${whitelabel}:${provider}:${profile_type}`;
}

/**
 * Load single profile to Redis
 * @param {Object} profile - Endpoint profile object
 * @param {Redis} redisClient - Redis client instance
 * @returns {Promise<string>} Redis key where profile was stored
 */
async function loadProfileToRedis(profile, redisClient) {
  const validatedProfile = validateEndpointProfile(profile);
  const redisKey = buildRedisKey(profile);
  
  await redisClient.set(redisKey, JSON.stringify(validatedProfile));
  
  return redisKey;
}

/**
 * Load profiles from JSON file
 * @param {string} filePath - Path to JSON file containing profile(s)
 * @param {Redis} redisClient - Redis client instance
 * @returns {Promise<Array<string>>} Array of Redis keys where profiles were stored
 */
async function loadProfilesFromFile(filePath, redisClient) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  let data;
  
  try {
    data = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Invalid JSON in file ${filePath}: ${error.message}`);
  }
  
  const profiles = Array.isArray(data) ? data : [data];
  const keys = [];
  
  for (let i = 0; i < profiles.length; i++) {
    try {
      const key = await loadProfileToRedis(profiles[i], redisClient);
      keys.push(key);
      console.log(`✓ Loaded profile to Redis: ${key}`);
    } catch (error) {
      throw new Error(`Failed to load profile at index ${i}: ${error.message}`);
    }
  }
  
  return keys;
}

/**
 * Create Redis client
 * @returns {Redis} Redis client instance
 */
function createRedisClient() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  const client = new Redis(redisUrl, {
    retryStrategy: (times) => {
      if (times > 3) {
        return null;
      }
      return Math.min(times * 50, 2000);
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  
  return client;
}

/**
 * CLI execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Error: No file path provided');
    console.error('Usage: node endpoint-profile-loader.js <profile.json>');
    process.exit(1);
  }
  
  const filePath = path.resolve(args[0]);
  let redisClient;
  
  try {
    require('dotenv').config();
    
    redisClient = createRedisClient();
    
    await new Promise((resolve, reject) => {
      redisClient.once('ready', resolve);
      redisClient.once('error', reject);
      setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
    });
    
    console.log('Connected to Redis');
    
    const keys = await loadProfilesFromFile(filePath, redisClient);
    
    console.log(`\n✓ Successfully loaded ${keys.length} profile(s) to Redis`);
    
    process.exit(0);
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  } finally {
    if (redisClient) {
      await redisClient.quit();
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildRedisKey,
  loadProfileToRedis,
  loadProfilesFromFile,
  createRedisClient
};
