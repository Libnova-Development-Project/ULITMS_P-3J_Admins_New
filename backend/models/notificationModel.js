const pool = require('../database/db');

class NotificationModel {
    static async getByUserId(userId) {
        const result = await pool.query(
            `SELECT * FROM library_schema.notifications 
             WHERE user_id = $1 
             ORDER BY created_at DESC LIMIT 50`,
            [userId]
        );
        return result.rows;
    }

    static async getUnreadCount(userId) {
        const result = await pool.query(
            `SELECT COUNT(*) FROM library_schema.notifications 
             WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
        return parseInt(result.rows[0].count);
    }

    static async markAsRead(id, userId) {
        const result = await pool.query(
            `UPDATE library_schema.notifications 
             SET is_read = true 
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [id, userId]
        );
        return result.rows[0];
    }

    static async markAllAsRead(userId) {
        const result = await pool.query(
            `UPDATE library_schema.notifications 
             SET is_read = true 
             WHERE user_id = $1`,
            [userId]
        );
        return result.rowCount;
    }

    static async create(userId, title, message, type = 'info') {
        const result = await pool.query(
            `INSERT INTO library_schema.notifications (user_id, title, message, type)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [userId, title, message, type]
        );
        return result.rows[0];
    }
}

module.exports = NotificationModel;
