const { pool } = require('../config/db');

module.exports = {
  submit: async (userId, bookId) => {
    const r = await pool.query('CALL sp_submit_borrow_request($1,$2,NULL)', [userId, bookId]);
    return { borrow_id: r.rows[0]?.p_borrow_id };
  },
  mine: (userId) =>
    pool.query('SELECT * FROM fn_get_user_borrowings($1)', [userId]).then((r) => r.rows),
  pending: () =>
    pool.query('SELECT * FROM fn_get_pending_requests()').then((r) => r.rows),
  active: () =>
    pool.query('SELECT * FROM vw_active_borrowings').then((r) => r.rows),
  decide: (borrowId, adminId, decision, note, loanDays = 7) =>
    pool.query('CALL sp_decide_borrow_request($1::int,$2::int,$3::varchar,$4::text,$5::int)',
      [borrowId, adminId, decision, note || null, loanDays]),
  issue: (borrowId, adminId) =>
    pool.query('CALL sp_issue_book($1,$2)', [borrowId, adminId]),
  requestReturn: (borrowId, userId) =>
    pool.query('CALL sp_request_return($1,$2)', [borrowId, userId]),
  confirmReturn: async (borrowId, adminId) => {
    const r = await pool.query('CALL sp_confirm_return($1,$2,NULL)', [borrowId, adminId]);
    return r.rows[0]?.p_fine;
  },
  markOverdue: async () => {
    const r = await pool.query('CALL sp_mark_overdue_borrowings(NULL)');
    return r.rows[0]?.p_updated;
  },
};
