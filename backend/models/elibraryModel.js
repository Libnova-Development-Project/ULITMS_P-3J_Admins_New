const pool = require('../database/db');

class ElibraryModel {
    // Get all E-Library units
    static async getAllUnits(activeOnly = true) {
        let query = `
            SELECT eu.*, 
                   COUNT(p.id) as peripherals_count,
                   COUNT(CASE WHEN p.condition != 'good' THEN 1 END) as damaged_peripherals
            FROM library_schema.elibrary_units eu
            LEFT JOIN library_schema.peripherals p ON eu.id = p.unit_id AND p.is_deleted = false
            WHERE eu.is_deleted = false
        `;
        
        if (activeOnly) {
            query += ` AND eu.is_active = true`;
        }
        
        query += ` GROUP BY eu.id ORDER BY eu.unit_number`;
        
        const result = await pool.query(query);
        return result.rows;
    }

    // Get unit by ID
    static async getUnitById(id) {
        const result = await pool.query(
            `SELECT eu.*, 
                    COUNT(p.id) as peripherals_count
             FROM library_schema.elibrary_units eu
             LEFT JOIN library_schema.peripherals p ON eu.id = p.unit_id AND p.is_deleted = false
             WHERE eu.id = $1 AND eu.is_deleted = false
             GROUP BY eu.id`,
            [id]
        );
        return result.rows[0];
    }

    // Create E-Library unit
    static async createUnit(unitData) {
        const { unit_number, label, location, specs, condition = 'good' } = unitData;
        
        const result = await pool.query(
            `INSERT INTO library_schema.elibrary_units 
             (unit_number, label, location, specs, condition)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [unit_number, label, location, specs, condition]
        );
        return result.rows[0];
    }

    // Update unit
    static async updateUnit(id, updates) {
        const allowedFields = ['label', 'location', 'specs', 'condition', 'is_active'];
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
            UPDATE library_schema.elibrary_units 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND is_deleted = false
            RETURNING *
        `;
        
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Delete unit (soft delete)
    static async deleteUnit(id) {
        const result = await pool.query(
            `UPDATE library_schema.elibrary_units 
             SET is_deleted = true, is_active = false
             WHERE id = $1 AND is_deleted = false
             RETURNING id`,
            [id]
        );
        return result.rows[0];
    }

    // Start session
    static async startSession(userId, unitId, purpose = null, monitoredBy = null) {
        // Check if unit is available (more accurate check)
        const activeSession = await pool.query(
            `SELECT es.* FROM library_schema.elibrary_sessions es
             JOIN library_schema.users u ON es.user_id = u.id
             WHERE es.unit_id = $1 AND es.time_out IS NULL AND u.is_deleted = false
             ORDER BY es.time_in DESC
             LIMIT 1`,
            [unitId]
        );
        
        // Check if there's a recent active session (within last 5 minutes)
        if (activeSession.rows.length > 0) {
            const sessionTime = new Date(activeSession.rows[0].time_in);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            
            // Allow new session if current session is older than 5 minutes
            if (sessionTime > fiveMinutesAgo) {
                throw new Error('Unit is currently in use');
            }
        }
        
        const result = await pool.query(
            `INSERT INTO library_schema.elibrary_sessions 
             (user_id, unit_id, purpose, monitored_by, time_in)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             RETURNING *`,
            [userId, unitId, purpose, monitoredBy]
        );
        
        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [userId, 'START_SESSION', { unit_id: unitId }]
        );
        
        return result.rows[0];
    }

    // End session
    static async endSession(sessionId) {
        const result = await pool.query(
            `UPDATE library_schema.elibrary_sessions 
             SET time_out = CURRENT_TIMESTAMP
             WHERE id = $1 AND time_out IS NULL
             RETURNING *`,
            [sessionId]
        );
        
        if (result.rows[0]) {
            // Log activity
            await pool.query(
                `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
                 VALUES ($1, $2, $3)`,
                [result.rows[0].user_id, 'END_SESSION', { session_id: sessionId }]
            );
        }
        
        return result.rows[0];
    }

    // Get user's sessions
    static async getUserSessions(userId, limit = 50) {
        const result = await pool.query(
            `SELECT es.*, eu.unit_number, eu.label
             FROM library_schema.elibrary_sessions es
             JOIN library_schema.elibrary_units eu ON es.unit_id = eu.id
             WHERE es.user_id = $1
             ORDER BY es.time_in DESC
             LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    }

    // Get all sessions (admin)
    static async getAllSessions(limit = 100, offset = 0, activeOnly = false) {
        let query = `
            SELECT es.*, 
                   u.first_name, u.last_name, u.student_id,
                   eu.unit_number, eu.label
            FROM library_schema.elibrary_sessions es
            JOIN library_schema.users u ON es.user_id = u.id
            JOIN library_schema.elibrary_units eu ON es.unit_id = eu.id
            WHERE 1=1
        `;
        const values = [];
        let paramIndex = 1;
        
        if (activeOnly) {
            query += ` AND es.time_out IS NULL`;
        }
        
        query += ` ORDER BY es.time_in DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);
        
        const result = await pool.query(query, values);
        
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM library_schema.elibrary_sessions`
        );
        
        return {
            sessions: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit,
            offset
        };
    }

    // Get currently active sessions
    static async getActiveSessions() {
        const result = await pool.query(
            `SELECT es.*, 
                    u.first_name, u.last_name, u.student_id,
                    eu.unit_number, eu.label
             FROM library_schema.elibrary_sessions es
             JOIN library_schema.users u ON es.user_id = u.id
             JOIN library_schema.elibrary_units eu ON es.unit_id = eu.id
             WHERE es.time_out IS NULL AND u.is_deleted = false
             ORDER BY es.time_in ASC`
        );
        return result.rows;
    }

    // Get user statistics
    static async getUserStats(userId) {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN time_out IS NULL THEN 1 END) as active_sessions,
                SUM(EXTRACT(EPOCH FROM (COALESCE(time_out, CURRENT_TIMESTAMP) - time_in))/3600) as total_hours
             FROM library_schema.elibrary_sessions
             WHERE user_id = $1`,
            [userId]
        );
        return result.rows[0];
    }
}

module.exports = ElibraryModel;