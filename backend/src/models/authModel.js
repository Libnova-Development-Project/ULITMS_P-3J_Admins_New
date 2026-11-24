const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

module.exports = {
  register: async (body) => {
    const hash = await bcrypt.hash(body.password, 12);
    const r = await pool.query(
      'CALL sp_register_user($1,$2,$3,$4,$5,$6,$7,$8,NULL)',
      [body.student_number, body.first_name, body.last_name, body.email.toLowerCase().trim(),
       hash, 'student', body.course || null, body.year_level || null]
    );
    const userId = r.rows[0]?.p_user_id;
    return { user_id: userId };
  },
  login: async (email) =>
    pool.query('SELECT * FROM fn_get_user_for_login($1)', [email.toLowerCase().trim()])
      .then((r) => r.rows[0] || null),
  me: async (userId) =>
    pool.query(`SELECT user_id, student_number, first_name, last_name, email, role,
                       contact_number, course, year_level, status, preferences, created_at
                FROM users WHERE user_id=$1 AND deleted_at IS NULL`, [userId])
      .then((r) => r.rows[0] || null),
};
