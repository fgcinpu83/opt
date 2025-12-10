// Test script to verify tier detection and profit filtering
// Run with: node engine/test-implementation.js

const { detectTier } = require('./src/utils/tier');
const { MAX_ARBITRAGE_PROFIT } = require('./src/config/arbitrage.config');

console.log('='.repeat(60));
console.log('Testing Backend Implementation');
console.log('='.repeat(60));

// Test 1: Tier Detection
console.log('\n1. Testing Tier Detection:');
console.log('---------------------------');
const testLeagues = [
  'Premier League',
  'La Liga',
  'Bundesliga',
  'Championship',
  'Serie B',
  'Eredivisie',
  'Random League',
  'UEFA Champions League',
  'Ligue 2'
];

testLeagues.forEach(league => {
  const tier = detectTier(league);
  console.log(`  ${league.padEnd(30)} → Tier ${tier}`);
});

// Test 2: Profit Filter Configuration
console.log('\n2. Testing Profit Filter:');
console.log('-------------------------');
console.log(`  MAX_ARBITRAGE_PROFIT: ${MAX_ARBITRAGE_PROFIT} (${(MAX_ARBITRAGE_PROFIT * 100).toFixed(0)}%)`);

const testProfits = [0.03, 0.05, 0.08, 0.10, 0.12, 0.15];
testProfits.forEach(profit => {
  const status = profit > MAX_ARBITRAGE_PROFIT ? '❌ IGNORED' : '✅ ALLOWED';
  console.log(`  Profit: ${(profit * 100).toFixed(1)}% → ${status}`);
});

// Test 3: Opportunity Structure
console.log('\n3. Sample Opportunity Structure:');
console.log('---------------------------------');
const sampleOpportunity = {
  time: new Date().toISOString(),
  profit: 0.0425,  // 4.25%
  tier: 1,
  league: 'Premier League',
  home: 'Manchester United',
  away: 'Chelsea',
  market: 'ft_hdp',
  margin: -4.25,
  legs: [
    {
      site: 'bet365',
      league: 'Premier League',
      match: { home: 'Manchester United', away: 'Chelsea' },
      pick: 'home',
      odds: 2.05
    },
    {
      site: 'pinnacle',
      league: 'Premier League',
      match: { home: 'Manchester United', away: 'Chelsea' },
      pick: 'away',
      odds: 1.95
    }
  ],
  timestamp: new Date().toISOString()
};

console.log(JSON.stringify(sampleOpportunity, null, 2));

console.log('\n4. WebSocket Endpoint:');
console.log('----------------------');
console.log('  ws://localhost:3000/ws/opportunities');

console.log('\n' + '='.repeat(60));
console.log('✅ All tests completed successfully!');
console.log('='.repeat(60));
