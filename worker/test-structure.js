#!/usr/bin/env node
/**
 * Test Script - Verify Worker Module Structure
 * This script tests that all modules can be loaded and basic functions work
 */

console.log('='.repeat(60));
console.log('Worker Module Structure Test');
console.log('='.repeat(60));
console.log();

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

// Test 1: Config Constants
test('Load config/constants.js', () => {
  const constants = require('./config/constants');
  if (!constants.TIMEOUTS) throw new Error('TIMEOUTS not found');
  if (!constants.URLS) throw new Error('URLS not found');
  if (!constants.RETRIES) throw new Error('RETRIES not found');
});

// Test 2: Logger
test('Load utils/logger.js', () => {
  const logger = require('./utils/logger');
  if (typeof logger.info !== 'function') throw new Error('logger.info not a function');
  if (typeof logger.error !== 'function') throw new Error('logger.error not a function');
});

// Test 3: Logger functionality
test('Logger functionality', () => {
  const logger = require('./utils/logger');
  logger.info('Test info message');
  logger.debug('Test debug message');
  logger.warn('Test warn message');
});

// Test 4: Validators
test('Load utils/validators.js', () => {
  const validators = require('./utils/validators');
  if (typeof validators.isValidUrl !== 'function') throw new Error('isValidUrl not a function');
  if (typeof validators.isValidOdds !== 'function') throw new Error('isValidOdds not a function');
});

// Test 5: Validators functionality
test('Validators functionality', () => {
  const validators = require('./utils/validators');
  if (!validators.isValidUrl('http://example.com')) throw new Error('Valid URL failed');
  if (validators.isValidUrl('invalid')) throw new Error('Invalid URL passed');
  
  const validOdds = { home: 2.5, draw: 3.0, away: 2.8 };
  if (!validators.isValidOdds(validOdds)) throw new Error('Valid odds failed');
});

// Test 6: Formatters
test('Load utils/formatters.js', () => {
  const formatters = require('./utils/formatters');
  if (typeof formatters.formatDate !== 'function') throw new Error('formatDate not a function');
  if (typeof formatters.formatOdds !== 'function') throw new Error('formatOdds not a function');
});

// Test 7: Formatters functionality
test('Formatters functionality', () => {
  const formatters = require('./utils/formatters');
  const date = formatters.formatDate(new Date());
  if (!date.includes('T')) throw new Error('Date format incorrect');
  
  const odds = formatters.formatOdds({ home: 2.555, draw: 3.333, away: 2.888 });
  if (odds.home !== '2.56') throw new Error('Odds format incorrect');
});

// Test 8: Browser Service
test('Load services/browserService.js', () => {
  const browserService = require('./services/browserService');
  if (typeof browserService.launchBrowser !== 'function') throw new Error('launchBrowser not a function');
  if (typeof browserService.goto !== 'function') throw new Error('goto not a function');
});

// Test 9: Proxy Service
test('Load services/proxyService.js', () => {
  const proxyService = require('./services/proxyService');
  if (typeof proxyService.setProxies !== 'function') throw new Error('setProxies not a function');
  if (typeof proxyService.getNextProxy !== 'function') throw new Error('getNextProxy not a function');
});

// Test 10: Proxy Service functionality
test('Proxy Service functionality', () => {
  const proxyService = require('./services/proxyService');
  proxyService.setProxies(['http://proxy1.com:8080', 'http://proxy2.com:8080']);
  if (proxyService.getTotalProxyCount() !== 2) throw new Error('Proxy count incorrect');
  
  const proxy = proxyService.getNextProxy();
  if (!proxy) throw new Error('No proxy returned');
});

// Test 11: Odds Service
test('Load services/oddsService.js', () => {
  const oddsService = require('./services/oddsService');
  if (typeof oddsService.validateOdds !== 'function') throw new Error('validateOdds not a function');
  if (typeof oddsService.calculateArbitrage !== 'function') throw new Error('calculateArbitrage not a function');
});

// Test 12: Odds Service functionality
test('Odds Service validation', () => {
  const oddsService = require('./services/oddsService');
  const validOdds = { home: 2.5, draw: 3.0, away: 2.8, provider: 'test' };
  if (!oddsService.validateOdds(validOdds)) throw new Error('Valid odds rejected');
  
  const invalidOdds = { home: 0.5, draw: 3.0, away: 2.8 };
  if (oddsService.validateOdds(invalidOdds)) throw new Error('Invalid odds accepted');
});

// Test 13: Session Manager
test('Load sessions/sessionManager.js', () => {
  const sessionManager = require('./sessions/sessionManager');
  if (typeof sessionManager.createSession !== 'function') throw new Error('createSession not a function');
  if (typeof sessionManager.getSession !== 'function') throw new Error('getSession not a function');
});

// Test 14: Session Manager functionality
test('Session Manager functionality', () => {
  const sessionManager = require('./sessions/sessionManager');
  if (sessionManager.getSessionCount() < 0) throw new Error('Invalid session count');
  
  const sessions = sessionManager.getAllSessions();
  if (!Array.isArray(sessions)) throw new Error('getAllSessions not returning array');
});

// Test 15: Main index.js
test('Load index.js', () => {
  const worker = require('./index');
  if (typeof worker.initialize !== 'function') throw new Error('initialize not exported');
  if (typeof worker.start !== 'function') throw new Error('start not exported');
  if (typeof worker.stop !== 'function') throw new Error('stop not exported');
});

// Summary
console.log();
console.log('='.repeat(60));
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
} else {
  console.log();
  console.log('✓ All modules loaded successfully!');
  console.log('✓ Worker structure is valid and ready to use.');
  console.log();
}
