const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://arbuser:arbpass123@postgres:5432/arb_minimal'
});

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// BullMQ Queues
const loginQueue = new Queue('login', { connection: redis });
const scanQueue = new Queue('scan', { connection: redis });
const betQueue = new Queue('bet', { connection: redis });

// WebSocket Server
const wss = new WebSocket.Server({ noServer: true });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

// Broadcast to all WebSocket clients
function broadcast(event, data) {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Health ping broadcast every 5 seconds
setInterval(() => {
  broadcast('ping', { ms: Math.floor(Math.random() * 50) + 10 });
}, 5000);

// API Routes

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { accountId } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM accounts WHERE id = $1',
      [accountId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const account = result.rows[0];
    
    // Add login job to queue
    await loginQueue.add('login', {
      accountId: account.id,
      url: account.url,
      username: account.username,
      password: account.password
    });
    
    // Update status
    await pool.query(
      'UPDATE accounts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['logging_in', accountId]
    );
    
    broadcast('login', { accountId, status: 'logging_in' });
    
    res.json({ success: true, message: 'Login queued' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login status endpoint
app.get('/api/login-status', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, url, username, status, balance FROM accounts');
    res.json(result.rows);
  } catch (error) {
    console.error('Login status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settings endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE id = 1');
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    // ===== FAILSAFE: Debug log to see what frontend sends =====
    console.log("RECEIVED CONFIG PAYLOAD:", req.body);
    
    // ===== FAILSAFE: Accept multiple field name variations =====
    // Support camelCase, snake_case, and various naming conventions
    const min_percentage = req.body.min_percentage || req.body.minPercentage || req.body.min_percent || req.body.minProfit || 0;
    const max_percentage = req.body.max_percentage || req.body.maxPercentage || req.body.max_percent || req.body.maxProfit || 10;
    const ht_time_last_bet = req.body.ht_time_last_bet || req.body.htTimeLastBet || req.body.minute_limit_ht || req.body.maxMinuteHT || 35;
    const ft_time_last_bet = req.body.ft_time_last_bet || req.body.ftTimeLastBet || req.body.minute_limit_ft || req.body.maxMinuteFT || 75;
    const match_filter = req.body.match_filter || req.body.matchFilter || 'all';
    
    // Market filters - accept both flat and nested formats
    const markets = req.body.markets || {};
    const ft_hdp = req.body.ft_hdp ?? req.body.ftHdp ?? markets.ftHdp ?? true;
    const ft_ou = req.body.ft_ou ?? req.body.ftOu ?? markets.ftOu ?? true;
    const ft_1x2 = req.body.ft_1x2 ?? req.body.ft1x2 ?? markets.ft1x2 ?? false;
    const ht_hdp = req.body.ht_hdp ?? req.body.htHdp ?? markets.htHdp ?? true;
    const ht_ou = req.body.ht_ou ?? req.body.htOu ?? markets.htOu ?? true;
    const ht_1x2 = req.body.ht_1x2 ?? req.body.ht1x2 ?? markets.ht1x2 ?? false;
    
    console.log("MAPPED VALUES:", {
      min_percentage,
      max_percentage,
      ht_time_last_bet,
      ft_time_last_bet,
      match_filter,
      ft_hdp,
      ft_ou,
      ft_1x2,
      ht_hdp,
      ht_ou,
      ht_1x2
    });
    
    await pool.query(`
      UPDATE settings SET
        min_percentage = $1,
        max_percentage = $2,
        ht_time_last_bet = $3,
        ft_time_last_bet = $4,
        match_filter = $5,
        ft_hdp = $6,
        ft_ou = $7,
        ft_1x2 = $8,
        ht_hdp = $9,
        ht_ou = $10,
        ht_1x2 = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [min_percentage, max_percentage, ht_time_last_bet, ft_time_last_bet, match_filter, ft_hdp, ft_ou, ft_1x2, ht_hdp, ht_ou, ht_1x2]);
    
    console.log("✅ Settings saved successfully to database");
    
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('❌ Update settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute bet endpoint
app.post('/api/execute', async (req, res) => {
  try {
    const { accountId, matchName, marketType, odds, stake } = req.body;
    
    // Round off stake to nearest 0 or 5
    const roundedStake = Math.round(stake / 5) * 5;
    
    // Insert bet record
    const result = await pool.query(
      'INSERT INTO bets (account_id, match_name, market_type, odds, stake, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [accountId, matchName, marketType, odds, roundedStake, 'pending']
    );
    
    // Add to bet queue
    await betQueue.add('execute', {
      betId: result.rows[0].id,
      accountId,
      matchName,
      marketType,
      odds,
      stake: roundedStake
    });
    
    broadcast('bet_queued', { betId: result.rows[0].id, accountId, matchName, stake: roundedStake });
    
    res.json({ success: true, betId: result.rows[0].id, stake: roundedStake });
  } catch (error) {
    console.error('Execute bet error:', error);
    res.status(500).json({ error: error.message });
  }
});

// System health endpoint
app.get('/api/system-health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT 1');
    const redisCheck = await redis.ping();
    
    res.json({
      healthy: true,
      database: dbCheck.rowCount > 0,
      redis: redisCheck === 'PONG',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      healthy: false,
      error: error.message
    });
  }
});

// Start scanning endpoint
app.post('/api/scan/start', async (req, res) => {
  try {
    await scanQueue.add('scan', {}, { repeat: { every: 3000 } });
    res.json({ success: true, message: 'Scanning started' });
  } catch (error) {
    console.error('Start scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Worker result handler
app.post('/api/worker/result', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'login_success') {
      await pool.query(
        'UPDATE accounts SET status = $1, balance = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['online', data.balance || 0, data.accountId]
      );
      broadcast('login', { accountId: data.accountId, status: 'online', balance: data.balance });
    } else if (type === 'login_failed') {
      await pool.query(
        'UPDATE accounts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['offline', data.accountId]
      );
      broadcast('login', { accountId: data.accountId, status: 'offline' });
    } else if (type === 'scan_result') {
      broadcast('scan', data);
    } else if (type === 'bet_executed') {
      await pool.query(
        'UPDATE bets SET status = $1 WHERE id = $2',
        ['accepted', data.betId]
      );
      broadcast('bet_executed', data);
    } else if (type === 'bet_failed') {
      await pool.query(
        'UPDATE bets SET status = $1 WHERE id = $2',
        ['failed', data.betId]
      );
      broadcast('bet_failed', data);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Worker result error:', error);
    res.status(500).json({ error: error.message });
  }
});

// HTTP Server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

// WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await redis.quit();
  await pool.end();
  server.close();
  process.exit(0);
});
