/**
 * Test Script for C-Sport Scraper
 * Run this to test the scraper without starting the full worker
 */

require('dotenv').config();
const { initializeRedis, closeRedis, testConnection } = require('./config/redis');
const csportScraper = require('./scrapers/csport');
const logger = require('./utils/logger');

async function main() {
  try {
    logger.info('='.repeat(60));
    logger.info('C-Sport Scraper Test');
    logger.info('='.repeat(60));
    
    // Initialize Redis
    logger.info('Connecting to Redis...');
    initializeRedis();
    
    const redisConnected = await testConnection();
    if (!redisConnected) {
      logger.error('Redis connection failed!');
      process.exit(1);
    }
    logger.info('✓ Redis connected');
    
    // Check credentials
    const credentials = {
      username: process.env.QQ188_USERNAME,
      password: process.env.QQ188_PASSWORD,
    };
    
    if (!credentials.username || !credentials.password) {
      logger.error('Missing QQ188 credentials in .env file!');
      logger.info('Please set QQ188_USERNAME and QQ188_PASSWORD');
      process.exit(1);
    }
    
    logger.info(`Using credentials: ${credentials.username}`);
    
    // Test scraper
    logger.info('Testing C-Sport scraper...');
    const result = await csportScraper.testScraper(credentials);
    
    if (result) {
      logger.info('='.repeat(60));
      logger.info('✓ Test Successful!');
      logger.info(`Provider: ${result.provider}`);
      logger.info(`Sport: ${result.sport}`);
      logger.info(`Matches: ${result.matches.length}`);
      logger.info('='.repeat(60));
      
      if (result.matches.length > 0) {
        logger.info('Sample match:');
        const sample = result.matches[0];
        logger.info(JSON.stringify(sample, null, 2));
      }
    } else {
      logger.error('✗ Test Failed!');
      logger.info('Check the logs above for error details');
    }
    
    // Cleanup
    await closeRedis();
    process.exit(0);
  } catch (error) {
    logger.error('Test failed with error:', error);
    await closeRedis();
    process.exit(1);
  }
}

// Run test
main();
