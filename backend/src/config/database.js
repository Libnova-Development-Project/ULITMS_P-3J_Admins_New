const { Pool } = require('pg');
require('dotenv').config();

const required = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters.');
}
const schema = process.env.DB_SCHEMA || 'library';
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
  throw new Error('DB_SCHEMA must be a valid PostgreSQL identifier.');
}
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: Number(process.env.DB_POOL_MAX || 10),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
  application_name: 'ULITMS_API',
  options: `-c search_path=${schema},public`
});
pool.on('error', (err) => console.error('[db] Pool error:', err.message));
module.exports = pool;
