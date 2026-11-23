const jwt = require('jsonwebtoken');
const pool = require('../config/database');

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, message: 'Authentication token required.' });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const result = await pool.query(
      `SELECT user_id, student_number, first_name, last_name, email, role, status
       FROM users WHERE user_id = $1 AND deleted_at IS NULL`,
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account is unavailable.' });
    }
    req.user = { ...user, id: user.user_id, student_id: user.student_number };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
    next(error);
  }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Administrator access required.' });
  }
  next();
}
module.exports = { auth, adminOnly };
