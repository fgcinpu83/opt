// src/config/database.js - PostgreSQL connection
const { Pool } = require('pg');
const logger = require('./logger');

let pool;

async function connectDatabase() {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    logger.info(`PostgreSQL connected successfully at ${result.rows[0].now}`);
    client.release();

    // Handle pool errors
    pool.on('error', (err) => {
      logger.error('Unexpected PostgreSQL pool error:', err);
    });

    return pool;
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    logger.info('PostgreSQL pool closed');
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDatabase() first.');
  }
  return pool;
}

module.exports = {
  connectDatabase,
  closeDatabase,
  getPool
};
