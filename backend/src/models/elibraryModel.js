const pool=require('../config/database');
const withActorTransaction=require('../utils/withActorTransaction');
class ElibraryModel {
  static async units(){
    const r=await pool.query(`SELECT u.*,u.unit_id AS id,u.unit_code AS unit_number,u.unit_code AS label,u.specifications AS specs,COUNT(p.peripheral_id)::int AS peripherals_count,
      COUNT(p.peripheral_id) FILTER(WHERE p.condition<>'good')::int AS damaged_peripherals
      FROM elibrary_units u LEFT JOIN peripherals p ON p.unit_id=u.unit_id AND p.deleted_at IS NULL AND p.is_active
      WHERE u.deleted_at IS NULL GROUP BY u.unit_id ORDER BY u.unit_code`);
    return r.rows;
  }
  static async unit(id){
    const r=await pool.query(`SELECT *,unit_id AS id,unit_code AS unit_number,unit_code AS label,specifications AS specs FROM elibrary_units WHERE unit_id=$1 AND deleted_at IS NULL`,[id]);return r.rows[0]||null;
  }
  static async createUnit(d,actorId){
    if(d.status && !['available','maintenance','offline'].includes(d.status)) throw Object.assign(new Error('New units must start as available, maintenance, or offline.'),{status:400});
    return withActorTransaction(actorId,async client=>{
    const r=await client.query(`INSERT INTO elibrary_units(unit_code,location,specifications,status)
      VALUES($1,$2,$3::jsonb,COALESCE($4,'available')) RETURNING *,unit_id AS id,unit_code AS unit_number,unit_code AS label,specifications AS specs`,
      [d.unit_code,d.location||null,JSON.stringify(d.specifications||{}),d.status||null]);return r.rows[0];
    });
  }
  static async updateUnit(id,d,actorId){
    return withActorTransaction(actorId,async client=>{
      const current=await client.query(`SELECT unit_id,status FROM elibrary_units WHERE unit_id=$1 AND deleted_at IS NULL FOR UPDATE`,[id]);
      if(!current.rowCount)return null;
      if(d.status!==undefined){
        if(!['available','maintenance','offline','in_use'].includes(d.status))
          throw Object.assign(new Error('Invalid unit status.'),{status:400});
        const active=await client.query(`SELECT 1 FROM elibrary_sessions WHERE unit_id=$1 AND time_out IS NULL`,[id]);
        if(active.rowCount && d.status!=='in_use')
          throw Object.assign(new Error('End the active session before changing this unit status.'),{status:409});
        if(!active.rowCount && d.status==='in_use')
          throw Object.assign(new Error('Unit status in_use is managed by active sessions.'),{status:400});
      }
      const fields=['unit_code','location','status'];const sets=[],vals=[];
      for(const f of fields)if(d[f]!==undefined){vals.push(d[f]);sets.push(`${f}=$${vals.length}`);}
      if(d.specifications!==undefined){vals.push(JSON.stringify(d.specifications));sets.push(`specifications=$${vals.length}::jsonb`);}
      if(!sets.length)return current.rows[0];
      sets.push('updated_at=CURRENT_TIMESTAMP');vals.push(id);
      const r=await client.query(`UPDATE elibrary_units SET ${sets.join(',')} WHERE unit_id=$${vals.length} AND deleted_at IS NULL RETURNING *,unit_id AS id,unit_code AS unit_number,unit_code AS label,specifications AS specs`,vals);
      return r.rows[0]||null;
    });
  }
  static async deleteUnit(id,actorId){
    return withActorTransaction(actorId,async client=>{
      const unit=await client.query(`SELECT unit_id FROM elibrary_units WHERE unit_id=$1 AND deleted_at IS NULL FOR UPDATE`,[id]);
      if(!unit.rowCount)return false;
      const active=await client.query(`SELECT 1 FROM elibrary_sessions WHERE unit_id=$1 AND time_out IS NULL`,[id]);
      if(active.rowCount)throw Object.assign(new Error('End the active session before deactivating this unit.'),{status:409});
      const r=await client.query(`UPDATE elibrary_units SET deleted_at=CURRENT_TIMESTAMP,status='offline',updated_at=CURRENT_TIMESTAMP
        WHERE unit_id=$1 AND deleted_at IS NULL RETURNING unit_id`,[id]);
      return !!r.rowCount;
    });
  }
  static async startSession(userId,unitId,purpose){
    const c=await pool.connect();
    try{
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.current_user_id',$1,true)`,[String(userId)]);
      const u=await c.query(`SELECT user_id FROM users WHERE user_id=$1 AND status='active' AND deleted_at IS NULL FOR SHARE`,[userId]);
      if(!u.rowCount)throw Object.assign(new Error('Active user not found.'),{status:404});
      const unit=await c.query(`SELECT unit_id,status FROM elibrary_units WHERE unit_id=$1 AND deleted_at IS NULL FOR UPDATE`,[unitId]);
      if(!unit.rowCount||unit.rows[0].status!=='available')throw Object.assign(new Error('Unit is not available.'),{status:409});
      const s=await c.query(`INSERT INTO elibrary_sessions(user_id,unit_id,purpose) VALUES($1,$2,$3) RETURNING *,session_id AS id`,[userId,unitId,purpose||null]);
      await c.query('COMMIT');return s.rows[0];
    }catch(e){await c.query('ROLLBACK');if(e.code==='23505')throw Object.assign(new Error('User or unit already has an active session.'),{status:409});throw e;}finally{c.release();}
  }
  static async endSession(sessionId,userId,isAdmin){
    const c=await pool.connect();
    try{
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.current_user_id',$1,true)`,[String(userId)]);
      const s=await c.query(`UPDATE elibrary_sessions SET time_out=CURRENT_TIMESTAMP
        WHERE session_id=$1 AND time_out IS NULL AND ($3::boolean OR user_id=$2) RETURNING *,session_id AS id`,[sessionId,userId,isAdmin]);
      if(!s.rowCount){await c.query('ROLLBACK');return null;}
      await c.query('COMMIT');return s.rows[0];
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  static async sessions({userId,limit,offset,activeOnly=false}){
    const vals=[];const w=[];
    if(userId){vals.push(userId);w.push(`s.user_id=$${vals.length}`);}
    if(activeOnly)w.push('s.time_out IS NULL');
    const clause=w.length?`WHERE ${w.join(' AND ')}`:'';
    vals.push(limit,offset);
    const r=await pool.query(`SELECT s.*,s.session_id AS id,u.first_name,u.last_name,u.student_number,unit.unit_code,unit.location
      FROM elibrary_sessions s JOIN users u USING(user_id) JOIN elibrary_units unit USING(unit_id)
      ${clause} ORDER BY s.time_in DESC LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);
    return r.rows;
  }
}
module.exports=ElibraryModel;
