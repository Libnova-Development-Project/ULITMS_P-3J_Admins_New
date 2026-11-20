const pool = require('../config/database');

class DamageReportModel {
    // Create damage report
    static async create(reportData) {
        const {
            reported_by, unit_id, peripheral_id, book_id, item_type = 'hardware', 
            damage_type, description, severity = 'low', damage_metadata
        } = reportData;
        
        const result = await pool.query(
            `INSERT INTO library_schema.damage_reports 
             (reported_by, unit_id, peripheral_id, book_id, item_type, damage_type, description, severity, damage_metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [reported_by, unit_id, peripheral_id, book_id, item_type, damage_type, description, severity, damage_metadata]
        );
        
        // Update condition if severity is high
        if (severity === 'high' || severity === 'critical') {
            if (peripheral_id) {
                await pool.query("UPDATE library_schema.peripherals SET condition = 'damaged' WHERE id = $1", [peripheral_id]);
            } else if (unit_id) {
                await pool.query("UPDATE library_schema.elibrary_units SET condition = 'repair_needed' WHERE id = $1", [unit_id]);
            } else if (book_id) {
                // If a book is critically damaged, maybe we mark it as unavailable
                await pool.query("UPDATE library_schema.books SET status = 'damaged' WHERE id = $1", [book_id]);
            }
        }
        
        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [reported_by, 'REPORT_DAMAGE', JSON.stringify({ item_type, item_id: book_id || peripheral_id || unit_id, severity })]
        );
        
        return result.rows[0];
    }

    // Get all damage reports
    static async getAll(limit = 100, offset = 0, status = null, severity = null) {
        let query = `
            SELECT dr.*, 
                   u.first_name || ' ' || u.last_name as reporter_name,
                   eu.unit_number,
                   p.name as peripheral_name,
                   b.title as book_title
            FROM library_schema.damage_reports dr
            LEFT JOIN library_schema.users u ON dr.reported_by = u.id
            LEFT JOIN library_schema.elibrary_units eu ON dr.unit_id = eu.id
            LEFT JOIN library_schema.peripherals p ON dr.peripheral_id = p.id
            LEFT JOIN library_schema.books b ON dr.book_id = b.id
            WHERE dr.is_deleted = false
        `;
        const values = [];
        let paramIndex = 1;
        
        if (status) {
            query += ` AND dr.resolved_by IS ${status === 'resolved' ? 'NOT NULL' : 'NULL'}`;
        }
        
        if (severity) {
            query += ` AND dr.severity = $${paramIndex}`;
            values.push(severity);
            paramIndex++;
        }
        
        query += ` ORDER BY dr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);
        
        const result = await pool.query(query, values);
        
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM library_schema.damage_reports WHERE is_deleted = false`
        );
        
        return {
            reports: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit,
            offset
        };
    }

    // Get report by ID
    static async findById(id) {
        const result = await pool.query(
            `SELECT dr.*, 
                    u.first_name || ' ' || u.last_name as reporter_name,
                    ru.first_name || ' ' || ru.last_name as resolver_name,
                    eu.unit_number,
                    p.name as peripheral_name,
                    b.title as book_title
             FROM library_schema.damage_reports dr
             LEFT JOIN library_schema.users u ON dr.reported_by = u.id
             LEFT JOIN library_schema.users ru ON dr.resolved_by = ru.id
             LEFT JOIN library_schema.elibrary_units eu ON dr.unit_id = eu.id
             LEFT JOIN library_schema.peripherals p ON dr.peripheral_id = p.id
             LEFT JOIN library_schema.books b ON dr.book_id = b.id
             WHERE dr.id = $1 AND dr.is_deleted = false`,
            [id]
        );
        return result.rows[0];
    }

    // Resolve damage report
    static async resolve(id, resolvedBy, resolutionNotes) {
        const result = await pool.query(
            `UPDATE library_schema.damage_reports 
             SET resolved_by = $1, 
                 resolved_at = CURRENT_TIMESTAMP, 
                 resolution_notes = $2
             WHERE id = $3 AND is_deleted = false AND resolved_by IS NULL
             RETURNING *`,
            [resolvedBy, resolutionNotes, id]
        );
        
        if (result.rows[0]) {
            const report = result.rows[0];
            if (report.peripheral_id) {
                await pool.query("UPDATE library_schema.peripherals SET condition = 'good' WHERE id = $1", [report.peripheral_id]);
            } else if (report.unit_id) {
                await pool.query("UPDATE library_schema.elibrary_units SET condition = 'good' WHERE id = $1", [report.unit_id]);
            } else if (report.book_id) {
                await pool.query("UPDATE library_schema.books SET status = 'available' WHERE id = $1", [report.book_id]);
            }
            
            await pool.query(
                `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
                 VALUES ($1, $2, $3)`,
                [resolvedBy, 'RESOLVE_DAMAGE', JSON.stringify({ report_id: id })]
            );
        }
        
        return result.rows[0];
    }

    // Get statistics
    static async getStats() {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_reports,
                COUNT(CASE WHEN resolved_by IS NULL THEN 1 END) as pending,
                COUNT(CASE WHEN resolved_by IS NOT NULL THEN 1 END) as resolved,
                COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
                COUNT(CASE WHEN item_type = 'book' THEN 1 END) as book_reports,
                COUNT(CASE WHEN item_type = 'hardware' THEN 1 END) as hardware_reports
             FROM library_schema.damage_reports
             WHERE is_deleted = false`
        );
        return result.rows[0];
    }
}

module.exports = DamageReportModel;