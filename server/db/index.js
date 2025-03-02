import pg from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const pool = new pg.Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Log database connection events
pool.on('connect', (client) => {
  logger.info('New database connection established');
});

pool.on('error', (err, client) => {
  logger.error('Unexpected database error', { 
    error: err.message,
    stack: err.stack
  });
});

export default pool;
