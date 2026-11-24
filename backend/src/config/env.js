const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Secrets are REQUIRED. There are no hard-coded fallbacks.
const need = (name) => {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name} (see .env.example)`);
  return process.env[name];
};
const jwtSecret = need('JWT_SECRET');
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'ulitms',
    user: process.env.DB_USER || 'app_user',
    password: need('DB_PASSWORD'),
  },
  loginRateWindowMs: Number(process.env.LOGIN_RATE_WINDOW_MS || 900000),
  loginRateMax: Number(process.env.LOGIN_RATE_MAX || 10),
};
