const pool=require('../config/database');
const withActorTransaction=require('../utils/withActorTransaction');
const DEFAULT_LOAN_DAYS=Number(process.env.LOAN_DURATION_DAYS || 7);
if(!Number.isInteger(DEFAULT_LOAN_DAYS)||DEFAULT_LOAN_DAYS<1||DEFAULT_LOAN_DAYS>30) throw new Error('LOAN_DURATION_DAYS must be an integer from 1 to 30.');
class BorrowingModel {
  static async request(userId,bookId){
    const c=await pool.connect();
    try{
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.current_user_id',$1,true)`,[String(userId)]);
      const u=await c.query(`SELECT user_id FROM users WHERE user_id=$1 AND status='active' AND deleted_at IS NULL FOR UPDATE`,[userId]);
      if(!u.rowCount) throw Object.assign(new Error('Active user not found.'),{status:404});
      const b=await c.query(`SELECT book_id,available_copies FROM books WHERE book_id=$1 AND status='active' AND deleted_at IS NULL FOR SHARE`,[bookId]);
      if(!b.rowCount || b.rows[0].available_copies<1) throw Object.assign(new Error('Book is unavailable for borrowing.'),{status:409});
      const eligibility=await c.query(`SELECT
        COUNT(*) FILTER(WHERE status='overdue')::int AS overdue_count,
        COUNT(*) FILTER(WHERE status IN ('pending_approval','approved','borrowed','pending_return','overdue'))::int AS open_count,
        COUNT(*) FILTER(WHERE book_id=$2 AND status IN ('pending_approval','approved','borrowed','pending_return','overdue'))::int AS same_book_count
        FROM borrow_transactions WHERE user_id=$1`,[userId,bookId]);
      const e=eligibility.rows[0];
      if(e.same_book_count>0) throw Object.assign(new Error('You already have an open request or loan for this book.'),{status:409});
      if(e.overdue_count>0) throw Object.assign(new Error('You have an overdue book. Return it first.'),{status:409});
      if(e.open_count>=3) throw Object.assign(new Error('Borrowing limit reached (maximum 3 open requests/loans).'),{status:409});
      const r=await c.query(`INSERT INTO borrow_transactions(user_id,book_id,status)
        VALUES($1,$2,'pending_approval') RETURNING *,borrow_id AS id`,[userId,bookId]);
      await c.query('COMMIT'); return r.rows[0];
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  static async approve(id,adminId,decisionNote=null){
    const c=await pool.connect();
    try{
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.current_user_id',$1,true)`,[String(adminId)]);
      const q=await c.query(`SELECT bt.*,b.available_copies,b.status AS book_status,b.deleted_at AS book_deleted
        FROM borrow_transactions bt JOIN books b USING(book_id)
        WHERE bt.borrow_id=$1 FOR UPDATE OF bt,b`,[id]);
      const row=q.rows[0];
      if(!row||row.status!=='pending_approval') throw Object.assign(new Error('Pending request not found.'),{status:404});
      if(row.user_id===adminId) throw Object.assign(new Error('You cannot approve your own borrowing request.'),{status:403});
      if(row.book_status!=='active'||row.book_deleted||row.available_copies<1) throw Object.assign(new Error('No available copy can be reserved.'),{status:409});
      await c.query(`UPDATE books SET available_copies=available_copies-1,updated_at=CURRENT_TIMESTAMP WHERE book_id=$1`,[row.book_id]);
      const r=await c.query(`UPDATE borrow_transactions SET status='approved',reviewed_by=$1,reviewed_at=CURRENT_TIMESTAMP,
        approved_at=CURRENT_TIMESTAMP,decision_note=$2,due_date=CURRENT_DATE + $3::int,updated_at=CURRENT_TIMESTAMP
        WHERE borrow_id=$4 RETURNING *,borrow_id AS id`,[adminId,decisionNote,DEFAULT_LOAN_DAYS,id]);
      await c.query('COMMIT'); return r.rows[0];
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  static async reject(id,adminId,note){
    if(!note||!String(note).trim()) throw Object.assign(new Error('A rejection reason is required.'),{status:400});
    return withActorTransaction(adminId,async client=>{
      const r=await client.query(`UPDATE borrow_transactions SET status='rejected',reviewed_by=$1,reviewed_at=CURRENT_TIMESTAMP,
        decision_note=$2,updated_at=CURRENT_TIMESTAMP WHERE borrow_id=$3 AND status='pending_approval' AND user_id<>$1 RETURNING *,borrow_id AS id`,
        [adminId,note,id]);
      if(!r.rowCount) throw Object.assign(new Error('Pending request not found or cannot be rejected.'),{status:404});
      return r.rows[0];
    });
  }
  static async issue(id,adminId){
    return withActorTransaction(adminId,async client=>{
      const r=await client.query(`UPDATE borrow_transactions SET status='borrowed',borrowed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
        WHERE borrow_id=$1 AND status='approved' RETURNING *,borrow_id AS id`,[id]);
      if(!r.rowCount) throw Object.assign(new Error('Approved request not found.'),{status:409});
      return r.rows[0];
    });
  }
  static async requestReturn(id,userId,isAdmin=false){
    return withActorTransaction(userId,async client=>{
      const r=await client.query(`UPDATE borrow_transactions SET status='pending_return',return_requested_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
        WHERE borrow_id=$1 AND status IN ('borrowed','overdue') AND ($3::boolean OR user_id=$2) RETURNING *,borrow_id AS id`,[id,userId,isAdmin]);
      if(!r.rowCount) throw Object.assign(new Error('Active borrowing not found.'),{status:404});
      return r.rows[0];
    });
  }
  static async confirmReturn(id,adminId){
    const c=await pool.connect();
    try{
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.current_user_id',$1,true)`,[String(adminId)]);
      const q=await c.query(`SELECT * FROM borrow_transactions WHERE borrow_id=$1 AND status='pending_return' FOR UPDATE`,[id]);
      const row=q.rows[0];
      if(!row) throw Object.assign(new Error('Pending return not found.'),{status:404});
      const fineQ=await c.query(`SELECT fn_calculate_fine($1::date,CURRENT_DATE) AS fine`,[row.due_date]);
      const fine=Number(fineQ.rows[0].fine);
      const upd=await c.query(`UPDATE borrow_transactions SET status='returned',returned_at=CURRENT_TIMESTAMP,
        confirmed_by=$1,fine_amount=$2,updated_at=CURRENT_TIMESTAMP WHERE borrow_id=$3 RETURNING *,borrow_id AS id`,[adminId,fine,id]);
      const restored=await c.query(`UPDATE books SET available_copies=available_copies+1,updated_at=CURRENT_TIMESTAMP
        WHERE book_id=$1 AND available_copies<total_copies RETURNING book_id`,[row.book_id]);
      if(!restored.rowCount) throw new Error('Inventory reservation could not be reconciled; return was rolled back.');
      await c.query('COMMIT'); return upd.rows[0];
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  static async markLost(id,adminId,note){
    return withActorTransaction(adminId,async client=>{
      const r=await client.query(`UPDATE borrow_transactions SET status='lost',decision_note=$1,
        metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('lost_by',$2,'lost_at',CURRENT_TIMESTAMP),
        updated_at=CURRENT_TIMESTAMP WHERE borrow_id=$3 AND status IN ('borrowed','overdue','pending_return') RETURNING *,borrow_id AS id`,
        [note||'Recorded as lost',adminId,id]);
      if(!r.rowCount) throw Object.assign(new Error('Eligible borrowing record not found.'),{status:404});
      // Lost books do not restore the inventory reservation.
      return r.rows[0];
    });
  }
  static async findById(id){
    const r=await pool.query(`SELECT bt.*,bt.borrow_id AS id,u.first_name,u.last_name,u.student_number,u.student_number AS student_id,b.title,b.author,b.isbn
      FROM borrow_transactions bt JOIN users u USING(user_id) JOIN books b USING(book_id)
      WHERE bt.borrow_id=$1`,[id]); return r.rows[0]||null;
  }
  static async list({limit,offset,status,userId}){
    const vals=[];const where=[];
    if(userId){vals.push(userId);where.push(`bt.user_id=$${vals.length}`);}
    if(status){vals.push(status);where.push(`bt.status=$${vals.length}`);}
    const clause=where.length?`WHERE ${where.join(' AND ')}`:'';
    const count=await pool.query(`SELECT COUNT(*) FROM borrow_transactions bt ${clause}`,vals);
    vals.push(limit,offset);
    const rows=await pool.query(`SELECT bt.*,bt.borrow_id AS id,u.first_name,u.last_name,u.student_number,u.student_number AS student_id,b.title,b.author,b.isbn
      FROM borrow_transactions bt JOIN users u USING(user_id) JOIN books b USING(book_id) ${clause}
      ORDER BY bt.requested_at DESC LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);
    return {borrowings:rows.rows,total:Number(count.rows[0].count),limit,offset};
  }
  static async overdue(){
    const r=await pool.query(`SELECT bt.*,bt.borrow_id AS id,u.first_name,u.last_name,u.email,u.student_number,u.student_number AS student_id,b.title,b.author
      FROM borrow_transactions bt JOIN users u USING(user_id) JOIN books b USING(book_id)
      WHERE bt.status IN ('borrowed','overdue') AND bt.due_date<CURRENT_DATE ORDER BY bt.due_date`);
    return r.rows;
  }
}
module.exports=BorrowingModel;
