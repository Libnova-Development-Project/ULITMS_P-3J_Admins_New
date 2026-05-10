const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20, // Max connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
    console.log('✅ PostgreSQL connected to ULITMS database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
});

// Test connection
pool.query('SELECT 1 FROM library_schema.users LIMIT 1')
    .then(() => console.log('✅ Schema "library_schema" is accessible'))
    .catch(err => console.error('❌ Schema error:', err.message));

module.exports = pool;