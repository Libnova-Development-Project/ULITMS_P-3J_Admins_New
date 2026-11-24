const { pool } = require('../config/db');

module.exports = {
  units: (role) =>
    pool.query(role === 'admin'
      ? 'SELECT * FROM vw_elibrary_unit_status'
      : `SELECT unit_id, unit_code, location, status, cpu, ram_gb, session_id, time_in
         FROM vw_elibrary_unit_status`)
      .then((r) => r.rows),
  start: async (userId, body) => {
    const r = await pool.query('CALL sp_start_elibrary_session($1,$2,$3,NULL)',
      [userId, body.unit_id, body.purpose || null]);
    return r.rows[0]?.p_session_id;
  },
  end: (sessionId, actorId) =>
    pool.query('CALL sp_end_elibrary_session($1,$2)', [sessionId, actorId]),
};
