const { pool } = require('../config/db');

module.exports = {
  create: async (userId, body) => {
    const r = await pool.query('CALL sp_submit_damage_report($1,$2,$3,$4,$5,$6,NULL)',
      [userId, body.unit_id || null, body.peripheral_id || null,
       body.damage_type, body.description, body.severity || null]);
    return r.rows[0]?.p_report_id;
  },
  open: () => pool.query('SELECT * FROM vw_open_damage_reports').then((r) => r.rows),
  resolve: (reportId, adminId, body) =>
    pool.query('CALL sp_resolve_damage_report($1,$2,$3,$4,$5)',
      [reportId, adminId, body.status, body.notes || null, body.new_condition || null]),
};
