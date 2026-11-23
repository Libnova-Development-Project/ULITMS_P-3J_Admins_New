const pool=require('../config/database');
class NotificationModel {
  static async list(userId){
    const [items,count]=await Promise.all([
      pool.query(`SELECT *,notification_id AS id FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,[userId]),
      pool.query(`SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id=$1 AND is_read=FALSE`,[userId])
    ]);
    return {notifications:items.rows,unread_count:count.rows[0].unread};
  }
  static async markRead(id,userId){
    const r=await pool.query(`UPDATE notifications SET is_read=TRUE WHERE notification_id=$1 AND user_id=$2 RETURNING notification_id`,[id,userId]);
    return !!r.rowCount;
  }
  static async markAllRead(userId){
    const r=await pool.query(`UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE`,[userId]);return r.rowCount;
  }
  static async create(userId,title,message,type='info',reference={}){
    const r=await pool.query(`INSERT INTO notifications(user_id,type,title,message,reference)
      VALUES($1,$2,$3,$4,$5::jsonb) RETURNING *,notification_id AS id`,[userId,type,title,message,JSON.stringify(reference)]);return r.rows[0];
  }
}
module.exports=NotificationModel;
