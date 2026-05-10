const pool = require('../database/db');
const bcrypt = require('bcryptjs');

class UserModel {
    // Create user
    static async create(userData) {
        const {
            student_id,
            first_name,
            middle_name,
            last_name,
            email,
            password,
            contact_number,
            course,
            year_level,
            role = 'student'
        } = userData;

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            `INSERT INTO library_schema.users 
             (student_id, first_name, middle_name, last_name, email, password, 
              contact_number, course, year_level, role)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id, student_id, first_name, middle_name, last_name, 
                       email, role, course, year_level, contact_number, 
                       is_active, created_at`,
            [student_id, first_name, middle_name, last_name, email, hashedPassword,
             contact_number, course, year_level, role]
        );
        
        return result.rows[0];
    }

    // Find by email
    static async findByEmail(email) {
        const result = await pool.query(
            `SELECT * FROM library_schema.users 
             WHERE email = $1 AND is_deleted = false`,
            [email]
        );
        return result.rows[0];
    }

    // Find by student ID
    static async findByStudentId(studentId) {
        const result = await pool.query(
            `SELECT * FROM library_schema.users 
             WHERE student_id = $1 AND is_deleted = false`,
            [studentId]
        );
        return result.rows[0];
    }

    // Find by ID
    static async findById(id) {
        const result = await pool.query(
            `SELECT id, student_id, first_name, middle_name, last_name, 
                    email, role, course, year_level, contact_number, 
                    is_active, created_at, updated_at
             FROM library_schema.users 
             WHERE id = $1 AND is_deleted = false`,
            [id]
        );
        return result.rows[0];
    }

    // Get all users (admin only)
    static async getAll(limit = 100, offset = 0) {
        const result = await pool.query(
            `SELECT id, student_id, first_name, middle_name, last_name, 
                    email, role, course, year_level, contact_number, 
                    is_active, created_at
             FROM library_schema.users 
             WHERE is_deleted = false
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows;
    }

    // Update user
    static async update(id, updates) {
        const allowedFields = ['first_name', 'middle_name', 'last_name', 
                               'course', 'year_level', 'contact_number'];
        const setClauses = [];
        const values = [];
        let paramIndex = 1;
        
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                setClauses.push(`${field} = $${paramIndex}`);
                values.push(updates[field]);
                paramIndex++;
            }
        }
        
        if (setClauses.length === 0) return null;
        
        values.push(id);
        const query = `
            UPDATE library_schema.users 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND is_deleted = false
            RETURNING id, student_id, first_name, middle_name, last_name, 
                      email, role, course, year_level, contact_number
        `;
        
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Change password
    static async changePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const result = await pool.query(
            `UPDATE library_schema.users 
             SET password = $1
             WHERE id = $2 AND is_deleted = false
             RETURNING id`,
            [hashedPassword, id]
        );
        return result.rows[0];
    }

    // Delete user (soft delete)
    static async delete(id) {
        const result = await pool.query(
            `UPDATE library_schema.users 
             SET is_deleted = true, is_active = false
             WHERE id = $1 AND is_deleted = false
             RETURNING id`,
            [id]
        );
        return result.rows[0];
    }

    // Get user statistics
    static async getUserStats(id) {
        const result = await pool.query(
            `SELECT 
                COUNT(DISTINCT bt.id) as total_borrowed,
                COUNT(DISTINCT CASE WHEN bt.status = 'borrowed' THEN bt.id END) as current_borrowed,
                COUNT(DISTINCT es.id) as total_sessions,
                COALESCE(SUM(bt.fine_amount), 0) as total_fines
             FROM library_schema.users u
             LEFT JOIN library_schema.borrow_transactions bt ON u.id = bt.user_id AND bt.is_deleted = false
             LEFT JOIN library_schema.elibrary_sessions es ON u.id = es.user_id
             WHERE u.id = $1 AND u.is_deleted = false
             GROUP BY u.id`,
            [id]
        );
        return result.rows[0] || { total_borrowed: 0, current_borrowed: 0, total_sessions: 0, total_fines: 0 };
    }
}

module.exports = UserModel;