const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');

const deny = (res, message) => res.status(401).json({ success: false, error: { message } });

// 1) verify the Bearer token, 2) re-read the account so a suspended, deleted or
// re-roled user loses access immediately (not only when the token expires).
// The role used by authorize() comes from the DATABASE, never from the token.
module.exports = async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return deny(res, 'Authentication required');

  let payload;
  try { payload = jwt.verify(header.slice(7), env.jwtSecret); }
  catch { return deny(res, 'Invalid or expired token'); }

  try {
    const { rows } = await pool.query(
      'SELECT user_id, role, status FROM users WHERE user_id = $1 AND deleted_at IS NULL', [payload.sub]);
    if (!rows.length || rows[0].status !== 'active') return deny(res, 'Account is not active');
    req.user = { sub: rows[0].user_id, role: rows[0].role };
    return next();
  } catch (err) {
    return next(err);
  }
};
