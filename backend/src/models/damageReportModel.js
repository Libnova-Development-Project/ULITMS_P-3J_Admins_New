const pool=require('../config/database');
const withActorTransaction=require('../utils/withActorTransaction');
class DamageReportModel {
  static async create(d){
    if(Boolean(d.unit_id)===Boolean(d.peripheral_id))
      throw Object.assign(new Error('Provide exactly one damage target: unit_id or peripheral_id.'),{status:400});
    return withActorTransaction(d.reported_by,async client=>{
    const r=await client.query(`INSERT INTO damage_reports(reported_by,unit_id,peripheral_id,damage_type,description,severity,metadata)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING *,report_id AS id`,
      [d.reported_by,d.unit_id||null,d.peripheral_id||null,d.damage_type,d.description,d.severity||'minor',JSON.stringify(d.metadata||{})]);
    return r.rows[0];
    });
  }
  static async list({limit,offset,status,severity,reportedBy}){
    const vals=[];const w=[];
    if(reportedBy){vals.push(reportedBy);w.push(`dr.reported_by=$${vals.length}`);}
    if(status){vals.push(status);w.push(`dr.status=$${vals.length}`);}
    if(severity){vals.push(severity);w.push(`dr.severity=$${vals.length}`);}
    const cl=w.length?`WHERE ${w.join(' AND ')}`:'';
    const count=await pool.query(`SELECT COUNT(*) FROM damage_reports dr ${cl}`,vals);
    vals.push(limit,offset);
    const r=await pool.query(`SELECT dr.*,dr.report_id AS id,reporter.first_name||' '||reporter.last_name AS reporter_name,
      resolver.first_name||' '||resolver.last_name AS resolver_name,u.unit_code,p.name AS peripheral_name
      FROM damage_reports dr JOIN users reporter ON reporter.user_id=dr.reported_by
      LEFT JOIN users resolver ON resolver.user_id=dr.resolved_by
      LEFT JOIN elibrary_units u USING(unit_id) LEFT JOIN peripherals p USING(peripheral_id)
      ${cl} ORDER BY dr.reported_at DESC LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);
    return {reports:r.rows,total:Number(count.rows[0].count),limit,offset};
  }
  static async find(id){
    const r=await pool.query(`SELECT dr.*,dr.report_id AS id,reporter.first_name||' '||reporter.last_name AS reporter_name,
      resolver.first_name||' '||resolver.last_name AS resolver_name,u.unit_code,p.name AS peripheral_name
      FROM damage_reports dr JOIN users reporter ON reporter.user_id=dr.reported_by
      LEFT JOIN users resolver ON resolver.user_id=dr.resolved_by
      LEFT JOIN elibrary_units u USING(unit_id) LEFT JOIN peripherals p USING(peripheral_id)
      WHERE dr.report_id=$1`,[id]);return r.rows[0]||null;
  }
  static async updateStatus(id,adminId,status,notes){
    return withActorTransaction(adminId,async client=>{
    const r=await client.query(`UPDATE damage_reports SET status=$1,
      resolved_by=CASE WHEN $1 IN ('resolved','closed') THEN $2 ELSE NULL END,
      resolved_at=CASE WHEN $1 IN ('resolved','closed') THEN CURRENT_TIMESTAMP ELSE NULL END,
      resolution_notes=$3,updated_at=CURRENT_TIMESTAMP WHERE report_id=$4 RETURNING *,report_id AS id`,
      [status,adminId,notes||null,id]);return r.rows[0]||null;
    });
  }
  static async stats(){
    const r=await pool.query(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER(WHERE status IN ('open','under_review'))::int AS pending,
      COUNT(*) FILTER(WHERE status IN ('resolved','closed'))::int AS resolved,
      COUNT(*) FILTER(WHERE severity='severe')::int AS severe FROM damage_reports`);
    return r.rows[0];
  }
}
module.exports=DamageReportModel;
