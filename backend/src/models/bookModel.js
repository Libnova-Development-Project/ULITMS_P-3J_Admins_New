const pool=require('../config/database');
const withActorTransaction=require('../utils/withActorTransaction');
const normalizeIsbn=value=>value?String(value).replace(/[\s-]/g,'').toUpperCase():null;
class BookModel {
  static async list({limit,offset,search,category_id}) {
    const vals=[]; const where=["b.deleted_at IS NULL","b.status='active'"];
    if(search){ vals.push(`%${search}%`); where.push(`(b.title ILIKE $${vals.length} OR b.author ILIKE $${vals.length} OR COALESCE(b.isbn,'') ILIKE $${vals.length})`); }
    if(category_id){ vals.push(category_id); where.push(`b.category_id=$${vals.length}`); }
    const count=await pool.query(`SELECT COUNT(*) FROM books b WHERE ${where.join(' AND ')}`,vals);
    vals.push(limit,offset);
    const rows=await pool.query(`SELECT b.*,b.book_id AS id,b.cover_image AS cover_image_url,c.category_name FROM books b LEFT JOIN book_categories c USING(category_id)
      WHERE ${where.join(' AND ')} ORDER BY b.title LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);
    return {books:rows.rows,total:Number(count.rows[0].count),limit,offset};
  }
  static async findById(id){
    const r=await pool.query(`SELECT b.*,b.book_id AS id,b.cover_image AS cover_image_url,c.category_name FROM books b LEFT JOIN book_categories c USING(category_id)
      WHERE b.book_id=$1 AND b.deleted_at IS NULL`,[id]); return r.rows[0]||null;
  }
  static async create(d,actorId){
    return withActorTransaction(actorId,async client=>{
    if(d.category_id){
      const cat=await client.query(`SELECT status FROM book_categories WHERE category_id=$1 FOR SHARE`,[d.category_id]);
      if(!cat.rowCount || cat.rows[0].status!=='active') throw Object.assign(new Error('Selected book category is inactive or does not exist.'),{status:400});
    }
    const r=await client.query(`INSERT INTO books(isbn,title,author,publisher,publication_year,category_id,total_copies,available_copies,cover_image,description,metadata)
      VALUES($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10::jsonb)
      RETURNING *,book_id AS id,cover_image AS cover_image_url`,[normalizeIsbn(d.isbn),d.title,d.author,d.publisher||null,d.publication_year||null,d.category_id||null,
      d.total_copies??1,d.cover_image||null,d.description||null,JSON.stringify(d.metadata||{})]);
    return r.rows[0];
    });
  }
  static async update(id,d,actorId){
    return withActorTransaction(actorId,async client=>{
    if(d.category_id!==undefined && d.category_id!==null){
      const current=await client.query(`SELECT category_id FROM books WHERE book_id=$1 AND deleted_at IS NULL`,[id]);
      if(!current.rowCount)return null;
      if(current.rows[0].category_id!==Number(d.category_id)){
        const cat=await client.query(`SELECT status FROM book_categories WHERE category_id=$1 FOR SHARE`,[d.category_id]);
        if(!cat.rowCount || cat.rows[0].status!=='active') throw Object.assign(new Error('Selected book category is inactive or does not exist.'),{status:400});
      }
    }
    const allowed=['isbn','title','author','publisher','publication_year','category_id','cover_image','description','metadata','status'];
    const sets=[],vals=[];
    for(const k of allowed) if(d[k]!==undefined){
      vals.push(k==='metadata'?JSON.stringify(d[k]):(k==='isbn'?normalizeIsbn(d[k]):d[k]));
      sets.push(`${k}=$${vals.length}${k==='metadata'?'::jsonb':''}`);
    }
    if(d.total_copies!==undefined){
      if(!Number.isInteger(Number(d.total_copies))||Number(d.total_copies)<0)
        throw Object.assign(new Error('total_copies must be a non-negative integer.'),{status:400});
      vals.push(Number(d.total_copies));
      sets.push(`available_copies=available_copies+($${vals.length}-total_copies),total_copies=$${vals.length}`);
    }
    if(!sets.length)return null;
    sets.push('updated_at=CURRENT_TIMESTAMP'); vals.push(id);
    const r=await client.query(`UPDATE books SET ${sets.join(',')} WHERE book_id=$${vals.length} AND deleted_at IS NULL RETURNING *,book_id AS id,cover_image AS cover_image_url`,vals);
    return r.rows[0]||null;
    });
  }
  static async softDelete(id,actorId){
    return withActorTransaction(actorId,async client=>{
    const r=await client.query(`UPDATE books SET deleted_at=CURRENT_TIMESTAMP,status='inactive',updated_at=CURRENT_TIMESTAMP
      WHERE book_id=$1 AND deleted_at IS NULL AND available_copies=total_copies RETURNING book_id`,[id]);
    return !!r.rowCount;
    });
  }
  static async categories(includeInactive=false){
    const r=await pool.query(`SELECT category_id,category_name,description,status,created_at,updated_at
      FROM book_categories ${includeInactive?'':'WHERE status=\'active\''} ORDER BY category_name`); return r.rows;
  }
  static async setCategoryStatus(id,status,actorId){
    return withActorTransaction(actorId,async client=>{
    const r=await client.query(`UPDATE book_categories SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE category_id=$2 RETURNING *`,[status,id]);
    return r.rows[0]||null;
    });
  }
  static async createCategory(name,description,actorId){
    return withActorTransaction(actorId,async client=>{
    const r=await client.query(`INSERT INTO book_categories(category_name,description) VALUES($1,$2) RETURNING *,category_id AS id`,[name,description||null]); return r.rows[0];
    });
  }
}
module.exports=BookModel;
