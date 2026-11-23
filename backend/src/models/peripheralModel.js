const pool=require('../config/database');
const withActorTransaction=require('../utils/withActorTransaction');
class PeripheralModel {
  static async list({limit,offset,unitId}){
    const vals=[];let where='p.deleted_at IS NULL';
    if(unitId){vals.push(unitId);where+=` AND p.unit_id=$${vals.length}`;}
    const count=await pool.query(`SELECT COUNT(*) FROM peripherals p WHERE ${where}`,vals);
    vals.push(limit,offset);
    const r=await pool.query(`SELECT p.*,p.peripheral_id AS id,pc.category_name,u.unit_code,u.unit_code AS unit_number FROM peripherals p
      JOIN peripheral_categories pc USING(category_id) LEFT JOIN elibrary_units u USING(unit_id)
      WHERE ${where} ORDER BY p.name LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);
    return {peripherals:r.rows,total:Number(count.rows[0].count),limit,offset};
  }
  static async find(id){
    const r=await pool.query(`SELECT p.*,p.peripheral_id AS id,pc.category_name,u.unit_code,u.unit_code AS unit_number FROM peripherals p
      JOIN peripheral_categories pc USING(category_id) LEFT JOIN elibrary_units u USING(unit_id)
      WHERE p.peripheral_id=$1 AND p.deleted_at IS NULL`,[id]);return r.rows[0]||null;
  }
  static async create(d,actorId){
    return withActorTransaction(actorId,async client=>{
    const r=await client.query(`INSERT INTO peripherals(unit_id,category_id,name,brand,model,serial_number,specifications,condition,is_active)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) RETURNING *,peripheral_id AS id`,
      [d.unit_id||null,d.category_id,d.name,d.brand||null,d.model||null,d.serial_number||null,
      JSON.stringify(d.specifications||{}),d.condition||'good',d.is_active!==false]);return r.rows[0];
    });
  }
  static async update(id,d,actorId){
    return withActorTransaction(actorId,async client=>{
    const allowed=['unit_id','category_id','name','brand','model','serial_number','condition','is_active'];
    const sets=[],vals=[];
    for(const k of allowed)if(d[k]!==undefined){vals.push(d[k]);sets.push(`${k}=$${vals.length}`);}
    if(d.specifications!==undefined){vals.push(JSON.stringify(d.specifications));sets.push(`specifications=$${vals.length}::jsonb`);}
    if(!sets.length)return null;
    sets.push('updated_at=CURRENT_TIMESTAMP');vals.push(id);
    const r=await client.query(`UPDATE peripherals SET ${sets.join(',')} WHERE peripheral_id=$${vals.length} AND deleted_at IS NULL RETURNING *,peripheral_id AS id`,vals);
    return r.rows[0]||null;
    });
  }
  static async softDelete(id,actorId){
    return withActorTransaction(actorId,async client=>{
    const r=await client.query(`UPDATE peripherals SET deleted_at=CURRENT_TIMESTAMP,is_active=FALSE,updated_at=CURRENT_TIMESTAMP
      WHERE peripheral_id=$1 AND deleted_at IS NULL RETURNING peripheral_id`,[id]);return !!r.rowCount;
    });
  }
  static async categories(){
    const r=await pool.query(`SELECT * FROM peripheral_categories ORDER BY category_name`);return r.rows;
  }
  static async createCategory(name,description,actorId){
    return withActorTransaction(actorId,async client=>{
    const r=await client.query(`INSERT INTO peripheral_categories(category_name,description) VALUES($1,$2) RETURNING *,category_id AS id`,[name,description||null]);return r.rows[0];
    });
  }
}
module.exports=PeripheralModel;
