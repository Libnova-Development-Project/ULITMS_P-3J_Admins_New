const pool = require('../config/database');

class PeripheralModel {
    // Get all peripherals
    static async getAll(unitId = null, limit = 100, offset = 0) {
        let query = `
            SELECT p.*, pc.name as category_name, eu.unit_number
            FROM library_schema.peripherals p
            LEFT JOIN library_schema.peripheral_categories pc ON p.category_id = pc.id
            LEFT JOIN library_schema.elibrary_units eu ON p.unit_id = eu.id
            WHERE p.is_deleted = false
        `;
        const values = [];
        let paramIndex = 1;
        
        if (unitId) {
            query += ` AND p.unit_id = $${paramIndex}`;
            values.push(unitId);
            paramIndex++;
        }
        
        query += ` ORDER BY p.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);
        
        const result = await pool.query(query, values);
        
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM library_schema.peripherals WHERE is_deleted = false`
        );
        
        return {
            peripherals: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit,
            offset
        };
    }

    // Get peripheral by ID
    static async findById(id) {
        const result = await pool.query(
            `SELECT p.*, pc.name as category_name, eu.unit_number
             FROM library_schema.peripherals p
             LEFT JOIN library_schema.peripheral_categories pc ON p.category_id = pc.id
             LEFT JOIN library_schema.elibrary_units eu ON p.unit_id = eu.id
             WHERE p.id = $1 AND p.is_deleted = false`,
            [id]
        );
        return result.rows[0];
    }

    // Create peripheral
    static async create(peripheralData) {
        const {
            unit_id, category_id, name, brand, model,
            serial_number, specifications, condition = 'good'
        } = peripheralData;
        
        const result = await pool.query(
            `INSERT INTO library_schema.peripherals 
             (unit_id, category_id, name, brand, model, serial_number, specifications, condition)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [unit_id, category_id, name, brand, model, serial_number, specifications, condition]
        );
        return result.rows[0];
    }

    // Update peripheral
    static async update(id, updates) {
        const allowedFields = ['name', 'brand', 'model', 'serial_number', 
                               'specifications', 'condition', 'is_active', 'category_id'];
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
            UPDATE library_schema.peripherals 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND is_deleted = false
            RETURNING *
        `;
        
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Delete peripheral (soft delete)
    static async delete(id) {
        const result = await pool.query(
            `UPDATE library_schema.peripherals 
             SET is_deleted = true, is_active = false
             WHERE id = $1 AND is_deleted = false
             RETURNING id`,
            [id]
        );
        return result.rows[0];
    }

    // Get categories
    static async getCategories() {
        const result = await pool.query(
            `SELECT * FROM library_schema.peripheral_categories 
             WHERE is_deleted = false 
             ORDER BY name`
        );
        return result.rows;
    }

    // Create category
    static async createCategory(name, description) {
        const result = await pool.query(
            `INSERT INTO library_schema.peripheral_categories (name, description)
             VALUES ($1, $2)
             RETURNING *`,
            [name, description]
        );
        return result.rows[0];
    }

    // Update peripheral condition
    static async updateCondition(id, condition) {
        const result = await pool.query(
            `UPDATE library_schema.peripherals 
             SET condition = $1
             WHERE id = $2 AND is_deleted = false
             RETURNING *`,
            [condition, id]
        );
        return result.rows[0];
    }
}

module.exports = PeripheralModel;