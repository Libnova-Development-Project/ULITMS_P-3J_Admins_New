const pool=require('../config/database');
module.exports=async function withActorTransaction(actorId,work){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    if(actorId!==undefined&&actorId!==null)
      await client.query(`SELECT set_config('app.current_user_id',$1,true)`,[String(actorId)]);
    const result=await work(client);
    await client.query('COMMIT');
    return result;
  }catch(error){
    try{await client.query('ROLLBACK');}catch(_){}
    throw error;
  }finally{client.release();}
};
