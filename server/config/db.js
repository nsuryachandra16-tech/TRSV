import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️ WARNING: DATABASE_URL is not set in environment variables. Falling back to local default.');
}

const pool = new Pool({
  connectionString: connectionString || 'postgresql://localhost:5432/trsv',
  ssl: connectionString && connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  max: 20, // Max 20 connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('connect', () => {
  console.log('🔌 [Database] Neon PostgreSQL connection pool established successfully.');
});

pool.on('error', (err) => {
  console.error('🚨 [Database] Unexpected error on idle database client:', err.message);
});

export const query = (text, params) => pool.query(text, params);
export default pool;
