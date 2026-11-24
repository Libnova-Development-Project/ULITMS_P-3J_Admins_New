const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  // Every object lives in the "library" schema. app_user already has this as its
  // role default (07_security.sql); setting it here protects against a wrong DB_USER.
  options: '-c search_path=library,public',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
pool.on('error', (err) => console.error('Unexpected PG pool error:', err.message));

module.exports = { pool };
