'use strict';

const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');
const Joi = require('joi');

const {
  validateEndpointProfile,
  validateEndpointProfilesBatch,
} = require('./endpoint-profile-schema');

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
});

/**
 * Redis key format:
 * endpoint_profile:{whitelabel}:{provider}:{profile_type}
 */

function buildRedisKey({ whitelabel, provider, profile_type }) {
  return `endpoint_profile:${whitelabel}:${provider}:${profile_type}`;
}

async function loadProfileToRedis(profile) {
  const { whitelabel, provider, profile_type } = profile;

  if (!whitelabel || !provider || !profile_type) {
    throw new Error('Invalid profile identity (whitelabel/provider/profile_type missing)');
  }

  const redisKey = buildRedisKey({ whitelabel, provider, profile_type });

  await redis.set(redisKey, JSON.stringify(profile));
  return redisKey;
}

async function loadProfilesFromFile(jsonFilePath) {
  const absolutePath = path.resolve(jsonFilePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Profile file not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf-8');
  const parsed = JSON.parse(raw);

  const profiles = Array.isArray(parsed) ? parsed : [parsed];

  // Schema validation (batch-safe)
  validateEndpointProfilesBatch(profiles);

  const results = [];

  for (const profile of profiles) {
    const key = await loadProfileToRedis(profile);
    results.push({
      redis_key: key,
      whitelabel: profile.whitelabel,
      provider: profile.provider,
      profile_type: profile.profile_type,
    });
  }

  return results;
}

/**
 * CLI usage:
 * node endpoint-profile-loader.js ./profiles/sbo-public.json
 */
if (require.main === module) {
  const file = process.argv[2];

  if (!file) {
    console.error('Usage: node endpoint-profile-loader.js <profile.json>');
    process.exit(1);
  }

  loadProfilesFromFile(file)
    .then((res) => {
      console.log('✅ Endpoint profiles loaded to Redis');
      res.forEach((r) => {
        console.log(`- ${r.redis_key}`);
      });
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Failed to load endpoint profiles');
      console.error(err.message);
      process.exit(1);
    });
}

module.exports = {
  loadProfilesFromFile,
  loadProfileToRedis,
  buildRedisKey,
};
