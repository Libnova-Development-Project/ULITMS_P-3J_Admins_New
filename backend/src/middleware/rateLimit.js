const rateLimit = require('express-rate-limit');
const env = require('../config/env');

module.exports = {
  login: rateLimit({
    windowMs: env.loginRateWindowMs,
    limit: env.loginRateMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many login attempts. Try again later.' } },
  }),
  general: rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many requests. Slow down.' } },
  }),
};
