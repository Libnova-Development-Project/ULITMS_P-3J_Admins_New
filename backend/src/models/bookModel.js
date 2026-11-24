const { pool } = require('../config/db');
const { withActor } = require('../utils/withActor');

module.exports = {
  search: (keyword, categoryId) =>
    pool.query('SELECT * FROM fn_search_books($1, $2)', [keyword || null, categoryId || null])
      .then((r) => r.rows),
  getOne: (id) =>
    pool.query('SELECT * FROM vw_active_catalog WHERE book_id=$1', [id]).then((r) => r.rows[0] || null),
  create: (actorId, body) =>
    withActor(actorId, async (client) => {
      const r = await client.query(`INSERT INTO books
        (isbn,title,author,publisher,publication_year,category_id,total_copies,available_copies)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
      [body.isbn || null, body.title, body.author, body.publisher || null,
       body.publication_year || null, body.category_id || null, body.total_copies]);
      return r.rows[0];
    }),
  update: async (actorId, id, body) => {
    const fields = ['isbn','title','author','publisher','publication_year','category_id','total_copies'];
    const entries = fields.filter((key) => Object.prototype.hasOwnProperty.call(body, key));
    if (!entries.length) throw Object.assign(new Error('At least one field is required'), { status: 400 });
    return withActor(actorId, async (client) => {
      const set = entries.map((key, i) => `${key}=$${i + 1}`).join(', ');
      const values = entries.map((key) => body[key]);
      const r = await client.query(
        `UPDATE books SET ${set}, updated_at=CURRENT_TIMESTAMP
         WHERE book_id=$${entries.length + 1} AND deleted_at IS NULL RETURNING *`,
        [...values, id]
      );
      return r.rows[0] || null;
    });
  },
  remove: (actorId, id) =>
    withActor(actorId, async (client) => {
      const r = await client.query(
        `UPDATE books SET deleted_at=CURRENT_TIMESTAMP, status='inactive'
         WHERE book_id=$1 AND deleted_at IS NULL RETURNING book_id`,
        [id]
      );
      return r.rows[0] || null;
    }),
};
