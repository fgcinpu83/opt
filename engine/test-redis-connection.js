#!/usr/bin/env node
// Test script to verify Redis connection with password authentication
// Usage: node test-redis-connection.js

require('dotenv').config();
const Redis = require('ioredis');

console.log('='.repeat(60));
console.log('Redis Connection Test');
console.log('='.repeat(60));
console.log();

// Display environment variables (masked)
console.log('Environment Variables:');
console.log('  REDIS_URL:', process.env.REDIS_URL ? process.env.REDIS_URL.replace(/:[^:@]+@/, ':****@') : 'Not set');
console.log('  REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? '****' : 'Not set');
console.log('  REDIS_HOST:', process.env.REDIS_HOST || 'redis (default)');
console.log('  REDIS_PORT:', process.env.REDIS_PORT || '6379 (default)');
console.log();

// Extract password from REDIS_URL
const redisUrl = process.env.REDIS_URL;
let redisPassword = process.env.REDIS_PASSWORD;

if (redisUrl) {
  const passwordMatch = redisUrl.match(/:\\/\\/:(.*)@/);
  if (passwordMatch && passwordMatch[1]) {
    redisPassword = passwordMatch[1];
    console.log('✓ Password extracted from REDIS_URL');
  }
}

console.log();
console.log('Connection Configuration:');
console.log('  Host:', process.env.REDIS_HOST || 'redis');
console.log('  Port:', process.env.REDIS_PORT || 6379);
console.log('  Password:', redisPassword ? '****' + redisPassword.slice(-4) : 'None');
console.log();

// Create Redis client
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

const client = new Redis(redisConfig);

client.on('connect', () => {
  console.log('✓ Redis connected successfully');
});

client.on('ready', () => {
  console.log('✓ Redis client ready');
});

client.on('error', (err) => {
  console.error('✗ Redis connection error:', err.message);
  process.exit(1);
});

// Test connection
async function testConnection() {
  try {
    console.log('Testing connection...');
    
    // Test 1: PING
    console.log('  Test 1: PING command...');
    const pingResult = await client.ping();
    console.log('    ✓ PING result:', pingResult);
    
    // Test 2: SET/GET
    console.log('  Test 2: SET/GET command...');
    await client.set('test:connection', 'success');
    const getValue = await client.get('test:connection');
    console.log('    ✓ GET result:', getValue);
    
    // Test 3: INFO
    console.log('  Test 3: INFO command...');
    const info = await client.info('server');
    const redisVersion = info.match(/redis_version:([^\\r\\n]+)/)?.[1];
    console.log('    ✓ Redis version:', redisVersion);
    
    // Test 4: Delete test key
    console.log('  Test 4: DEL command...');
    await client.del('test:connection');
    console.log('    ✓ Test key deleted');
    
    console.log();
    console.log('='.repeat(60));
    console.log('✓ ALL TESTS PASSED');
    console.log('='.repeat(60));
    
    await client.quit();
    process.exit(0);
    
  } catch (error) {
    console.error();
    console.error('✗ TEST FAILED:', error.message);
    console.error();
    console.error('Error details:', error);
    console.error();
    console.error('='.repeat(60));
    await client.quit();
    process.exit(1);
  }
}

// Run test
testConnection();
