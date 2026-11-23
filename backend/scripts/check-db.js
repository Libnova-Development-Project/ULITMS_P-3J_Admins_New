require('dotenv').config();
const pool=require('../src/config/database');
const required={
  users:['user_id','student_number','first_name','last_name','email','password_hash','role','status','deleted_at'],
  book_categories:['category_id','category_name','status'],
  books:['book_id','isbn','title','author','category_id','total_copies','available_copies','cover_image','deleted_at'],
  borrow_transactions:['borrow_id','user_id','book_id','status','reviewed_by','confirmed_by','due_date','fine_amount'],
  elibrary_units:['unit_id','unit_code','specifications','status','deleted_at'],
  elibrary_sessions:['session_id','user_id','unit_id','time_in','time_out'],
  peripheral_categories:['category_id','category_name'],
  peripherals:['peripheral_id','unit_id','category_id','condition','is_active','deleted_at'],
  damage_reports:['report_id','reported_by','unit_id','peripheral_id','severity','status','metadata'],
  notifications:['notification_id','user_id','type','title','message','reference','is_read'],
  audit_logs:['audit_id','table_name','record_id','operation','app_user_id'],
  system_logs:['log_id','log_level','message','context']
};
(async()=>{
  let failed=false;
  try{
    for(const [table,columns] of Object.entries(required)){
      const r=await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2`,[process.env.DB_SCHEMA||'library',table]);
      const present=new Set(r.rows.map(x=>x.column_name));
      const missing=columns.filter(c=>!present.has(c));
      if(missing.length){failed=true;console.error(`FAIL ${table}: missing ${missing.join(', ')}`);}
      else console.log(`OK   ${table}`);
    }
    const fn=await pool.query(`SELECT to_regprocedure($1) AS found`,['library.fn_get_user_for_login(character varying)']);
    if(!fn.rows[0].found){failed=true;console.error('FAIL missing function library.fn_get_user_for_login(varchar)');}
    else console.log('OK   fn_get_user_for_login(varchar)');
    const fineFn=await pool.query(`SELECT to_regprocedure($1) AS found`,['library.fn_calculate_fine(date,date)']);
    if(!fineFn.rows[0].found){failed=true;console.error('FAIL missing function library.fn_calculate_fine(date,date)');}
    else console.log('OK   fn_calculate_fine(date,date)');
    const overdueProc=await pool.query(`SELECT to_regprocedure($1) AS found`,['library.sp_mark_overdue_borrowings(integer)']);
    if(!overdueProc.rows[0].found){failed=true;console.error('FAIL missing procedure library.sp_mark_overdue_borrowings(integer)');}
    else console.log('OK   sp_mark_overdue_borrowings(integer)');
    const categoryTrigger=await pool.query(`SELECT 1 FROM pg_trigger WHERE tgrelid='library.books'::regclass AND tgname='trg_books_active_category' AND NOT tgisinternal`);
    if(!categoryTrigger.rowCount){failed=true;console.error('FAIL missing trigger trg_books_active_category');}
    else console.log('OK   trg_books_active_category');
    const cat=await pool.query(`SELECT 1 FROM information_schema.columns WHERE table_schema=$1 AND table_name='book_categories' AND column_name='status'`,[process.env.DB_SCHEMA||'library']);
    if(!cat.rowCount){failed=true;console.error('FAIL book_categories.status migration not applied');}
    const dmg=await pool.query(`SELECT conname FROM pg_constraint WHERE conrelid='library.damage_reports'::regclass AND conname='ck_report_has_exactly_one_target'`);
    if(!dmg.rowCount){failed=true;console.error('FAIL exact-one damage target migration not applied');}
  }catch(e){failed=true;console.error('Database verification failed:',e.message);}
  finally{await pool.end();}
  if(failed)process.exit(1);
  console.log('Database compatibility checks passed.');
})();
