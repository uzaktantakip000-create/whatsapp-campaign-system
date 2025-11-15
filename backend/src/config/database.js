const { Pool } = require('pg');
const logger = require('../utils/logger');

/**
 * PostgreSQL connection pool configuration
 * Manages database connections efficiently
 */

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'campaign_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'whatsapp_campaign',
  max: 20, // Max client sayısı
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Bağlantı event listeners
pool.on('connect', () => {
  logger.info('[Database] PostgreSQL bağlantısı kuruldu');
});

pool.on('error', (err) => {
  logger.error('[Database] PostgreSQL hatası:', err);
});

pool.on('remove', () => {
  logger.debug('[Database] Client pool\'dan kaldırıldı');
});

/**
 * Query wrapper with error handling and logging
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`[Database] Query executed in ${duration}ms`);
    return res;
  } catch (error) {
    logger.error(`[Database] Query error: ${error.message}`, { query: text, params });
    throw error;
  }
};

/**
 * Get a client from the pool
 * Useful for transactions
 * @returns {Promise<PoolClient>} Database client
 */
const getClient = async () => {
  try {
    const client = await pool.connect();
    logger.debug('[Database] Client acquired from pool');
    return client;
  } catch (error) {
    logger.error(`[Database] Failed to get client: ${error.message}`);
    throw error;
  }
};

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as now, version() as version');
    logger.info('[Database] Connection test successful');
    logger.info(`[Database] PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);
    return true;
  } catch (error) {
    logger.error(`[Database] Connection test failed: ${error.message}`);
    return false;
  }
};

/**
 * Close all connections
 * Call this when shutting down the application
 */
const close = async () => {
  try {
    await pool.end();
    logger.info('[Database] All connections closed');
  } catch (error) {
    logger.error(`[Database] Error closing connections: ${error.message}`);
  }
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  close
};
