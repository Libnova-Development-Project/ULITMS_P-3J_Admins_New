const { pool } = require('../config/db');
const { withActor } = require('../utils/withActor');

module.exports = {
  users: () => pool.query('SELECT * FROM vw_user_activity').then((r) => r.rows),
  updateUser: (actorId, id, body) => {
    const EDITABLE = ['first_name', 'last_name', 'course', 'year_level', 'contact_number', 'status'];
    const entries = Object.entries(body).filter(([key]) => EDITABLE.includes(key));
    if (!entries.length) throw Object.assign(new Error('At least one field is required'), { status: 400 });
    return withActor(actorId, async (client) => {
      const set = entries.map(([key], i) => `${key}=$${i + 1}`).join(', ');
      const values = entries.map(([, value]) => value);
      const r = await client.query(
        `UPDATE users SET ${set}, updated_at=CURRENT_TIMESTAMP
         WHERE user_id=$${entries.length + 1} AND deleted_at IS NULL
         RETURNING user_id, student_number, first_name, last_name, email, role,
                   contact_number, course, year_level, status, preferences`,
        [...values, id]
      );
      return r.rows[0] || null;
    });
  },
  removeUser: (actorId, id) =>
    withActor(actorId, async (client) => {
      const open = await client.query(
        `SELECT COUNT(*)::int AS n FROM borrow_transactions
         WHERE user_id=$1 AND status IN ('pending_approval','approved','borrowed','pending_return','overdue')`, [id]);
      if (open.rows[0].n > 0) {
        throw Object.assign(new Error('Cannot delete a user who still has open requests or loans'), { status: 409 });
      }
      const r = await client.query(
        `UPDATE users SET deleted_at=CURRENT_TIMESTAMP, status='inactive'
         WHERE user_id=$1 AND deleted_at IS NULL AND role<>'admin' RETURNING user_id`,
        [id]
      );
      return r.rows[0] || null;
    }),
  notifications: (userId) =>
    pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC', [userId])
      .then((r) => r.rows),
  markRead: (notificationId, userId) =>
    pool.query(`UPDATE notifications SET is_read=TRUE
                WHERE notification_id=$1 AND user_id=$2
                RETURNING *`, [notificationId, userId]).then((r) => r.rows[0] || null),
  dashboard: () =>
    pool.query('SELECT fn_get_dashboard_stats() AS stats').then((r) => r.rows[0].stats),
  inventory: () => pool.query('SELECT * FROM vw_inventory_check').then((r) => r.rows),
  audit: ({ table, record_id, operation, limit, offset }) => {
    const clauses = [];
    const values = [];
    if (table) { values.push(table); clauses.push(`table_name=$${values.length}`); }
    if (record_id) { values.push(record_id); clauses.push(`record_id=$${values.length}`); }
    if (operation) { values.push(operation); clauses.push(`operation=$${values.length}`); }
    values.push(limit); const limitPos = values.length;
    values.push(offset); const offsetPos = values.length;
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return pool.query(`SELECT * FROM vw_audit_trail ${where} LIMIT $${limitPos} OFFSET $${offsetPos}`, values)
      .then((r) => r.rows);
  },
};
