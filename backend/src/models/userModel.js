const pool = require('../config/database');
const withActorTransaction=require('../utils/withActorTransaction');
class UserModel {
  static async loginRecord(email) {
    const r=await pool.query(`SELECT * FROM fn_get_user_for_login($1)`,[email]);
    return r.rows[0]||null;
  }
  static async stats(id) {
    const r=await pool.query(`SELECT COUNT(*)::int AS total_borrowings,
      COUNT(*) FILTER(WHERE status IN ('approved','borrowed','pending_return','overdue'))::int AS active_borrowings,
      COUNT(*) FILTER(WHERE status='returned')::int AS returned,
      COALESCE(SUM(fine_amount),0)::numeric AS fines
      FROM borrow_transactions WHERE user_id=$1`,[id]);
    return r.rows[0];
  }
  static async findByEmail(email) {
    const r = await pool.query(`SELECT user_id,user_id AS id,student_number,student_number AS student_id,first_name,last_name,email,role,status,deleted_at FROM users WHERE LOWER(email)=LOWER($1) AND deleted_at IS NULL`, [email]);
    return r.rows[0] || null;
  }
  static async findById(id) {
    const r = await pool.query(
      `SELECT user_id, user_id AS id, student_number, student_number AS student_id, first_name, last_name, email, role, contact_number,
              course, year_level, status, preferences, created_at, updated_at
       FROM users WHERE user_id=$1 AND deleted_at IS NULL`, [id]);
    return r.rows[0] || null;
  }
  static async create(data,actorId=null) {
    return withActorTransaction(actorId,async client=>{
    const r = await client.query(
      `INSERT INTO users (student_number, first_name, last_name, email, password_hash,
                          contact_number, course, year_level, preferences)
       VALUES ($1,$2,$3,LOWER($4),$5,$6,$7,$8,$9::jsonb)
       RETURNING user_id, user_id AS id, student_number, student_number AS student_id, first_name, last_name, email, role, status`,
      [String(data.student_number).trim(), data.first_name, data.last_name, data.email,
       data.password_hash, data.contact_number || null, data.course || null,
       data.year_level || null, JSON.stringify(data.preferences || {})]);
    return r.rows[0];
    });
  }
  static async list({limit, offset, search, role, status}) {
    const vals=[]; const where=["deleted_at IS NULL"];
    if (search) { vals.push(`%${search}%`); where.push(`(first_name ILIKE $${vals.length} OR last_name ILIKE $${vals.length} OR email ILIKE $${vals.length} OR student_number ILIKE $${vals.length})`); }
    if (role) { vals.push(role); where.push(`role=$${vals.length}`); }
    if (status) { vals.push(status); where.push(`status=$${vals.length}`); }
    const count=await pool.query(`SELECT COUNT(*) FROM users WHERE ${where.join(' AND ')}`,vals);
    vals.push(limit,offset);
    const rows=await pool.query(
      `SELECT user_id,user_id AS id,student_number,student_number AS student_id,first_name,last_name,email,role,contact_number,course,year_level,status,created_at
       FROM users WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${vals.length-1} OFFSET $${vals.length}`, vals);
    return {users:rows.rows,total:Number(count.rows[0].count),limit,offset};
  }
  static async update(id, data,actorId) {
    return withActorTransaction(actorId,async client=>{
    const fields={first_name:'first_name',last_name:'last_name',contact_number:'contact_number',course:'course',year_level:'year_level',preferences:'preferences'};
    const sets=[],vals=[];
    for (const [key,col] of Object.entries(fields)) if (data[key] !== undefined) {
      vals.push(key==='preferences'?JSON.stringify(data[key]):data[key]);
      sets.push(`${col}=$${vals.length}${key==='preferences'?'::jsonb':''}`);
    }
    if (!sets.length) return null;
    sets.push('updated_at=CURRENT_TIMESTAMP'); vals.push(id);
    const r=await client.query(`UPDATE users SET ${sets.join(',')} WHERE user_id=$${vals.length} AND deleted_at IS NULL
      RETURNING user_id,user_id AS id,student_number,student_number AS student_id,first_name,last_name,email,role,contact_number,course,year_level,status,preferences`,vals);
    return r.rows[0]||null;
    });
  }
  static async setStatus(id,status,actorId=null) {
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      if(actorId) await client.query(`SELECT set_config('app.current_user_id',$1,true)`,[String(actorId)]);
      await client.query(`SELECT user_id FROM users WHERE user_id=$1 AND deleted_at IS NULL FOR UPDATE`,[id]);
      if(status!=='active') {
        // Preserve session history but close active sessions for disabled accounts.
        await client.query(`UPDATE elibrary_sessions SET time_out=CURRENT_TIMESTAMP
          WHERE user_id=$1 AND time_out IS NULL`,[id]);
      }
      const r=await client.query(`UPDATE users SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE user_id=$2 AND deleted_at IS NULL
        RETURNING user_id,status`,[status,id]);
      await client.query('COMMIT'); return r.rows[0]||null;
    } catch(e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }
  static async softDelete(id,actorId=null) {
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      if(actorId) await client.query(`SELECT set_config('app.current_user_id',$1,true)`,[String(actorId)]);
      await client.query(`SELECT user_id FROM users WHERE user_id=$1 AND deleted_at IS NULL FOR UPDATE`,[id]);
      // Close active computer sessions, but never fabricate book returns.
      await client.query(`UPDATE elibrary_sessions SET time_out=CURRENT_TIMESTAMP
        WHERE user_id=$1 AND time_out IS NULL`,[id]);
      const r=await client.query(`UPDATE users SET deleted_at=CURRENT_TIMESTAMP,status='inactive',updated_at=CURRENT_TIMESTAMP
        WHERE user_id=$1 AND deleted_at IS NULL RETURNING user_id`,[id]);
      await client.query('COMMIT'); return !!r.rowCount;
    } catch(e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }
  static async updatePassword(id, hash,actorId) {
    return withActorTransaction(actorId,async client=>{
    const r=await client.query(`UPDATE users SET password_hash=$1,updated_at=CURRENT_TIMESTAMP
      WHERE user_id=$2 AND deleted_at IS NULL RETURNING user_id`,[hash,id]);
    return !!r.rowCount;
    });
  }
  static async getPasswordHash(id) {
    const r=await pool.query(`SELECT out_password_hash AS password_hash FROM fn_get_user_for_login((SELECT email FROM users WHERE user_id=$1 AND deleted_at IS NULL))`,[id]);
    return r.rows[0]?.password_hash || null;
  }
  static async getAdmins() {
    const r=await pool.query(`SELECT user_id,first_name,last_name,email FROM users
      WHERE role='admin' AND status='active' AND deleted_at IS NULL`);
    return r.rows;
  }
}
module.exports=UserModel;
