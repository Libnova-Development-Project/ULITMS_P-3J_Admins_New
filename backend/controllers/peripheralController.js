const pool = require('../database/db');

// Helper function to validate condition
const isValidCondition = (condition) => {
    const validConditions = ['good', 'damaged', 'repair_needed', 'missing'];
    return validConditions.includes(condition);
};

exports.getAllPeripherals = async (req, res) => {
    try {
        const { unit_id, limit = 100, offset = 0 } = req.query;
        
        let query = `
            SELECT p.*, pc.name as category_name, eu.unit_number
            FROM library_schema.peripherals p
            LEFT JOIN library_schema.peripheral_categories pc ON p.category_id = pc.id
            LEFT JOIN library_schema.elibrary_units eu ON p.unit_id = eu.id
            WHERE p.is_deleted = false
        `;
        const values = [];
        let paramIndex = 1;
        
        if (unit_id) {
            query += ` AND p.unit_id = $${paramIndex}`;
            values.push(unit_id);
            paramIndex++;
        }
        
        query += ` ORDER BY p.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);
        
        const result = await pool.query(query, values);
        
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM library_schema.peripherals WHERE is_deleted = false`
        );
        
        res.json({
            success: true,
            message: 'Peripherals retrieved',
            data: {
                peripherals: result.rows,
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Get peripherals error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve peripherals', 
            error: error.message
        });
    }
};

exports.getPeripheralById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT p.*, pc.name as category_name, eu.unit_number
             FROM library_schema.peripherals p
             LEFT JOIN library_schema.peripheral_categories pc ON p.category_id = pc.id
             LEFT JOIN library_schema.elibrary_units eu ON p.unit_id = eu.id
             WHERE p.id = $1 AND p.is_deleted = false`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Peripheral not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Peripheral retrieved',
            data: { peripheral: result.rows[0] }
        });
    } catch (error) {
        console.error('Get peripheral error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve peripheral', 
            error: error.message
        });
    }
};

exports.createPeripheral = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required' 
            });
        }
        
        const {
            unit_id, category_id, name, brand, model,
            serial_number, specifications, condition
        } = req.body;
        
        console.log('📦 Received peripheral data:', req.body);
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({ 
                success: false,
                message: 'Equipment name is required' 
            });
        }
        
        if (!unit_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Unit ID is required' 
            });
        }
        
        // Validate and set condition - CRITICAL FIX
        let finalCondition = condition || 'good';
        
        // Log the condition value for debugging
        console.log(`📝 Condition received: "${condition}"`);
        
        // Validate condition is one of the allowed ENUM values
        if (!isValidCondition(finalCondition)) {
            console.log(`⚠️ Invalid condition: "${finalCondition}". Using "good" as default.`);
            finalCondition = 'good';
        }
        
        console.log(`✅ Final condition being saved: "${finalCondition}"`);
        
        // Handle category: if category_name is provided, find or create category
        let finalCategoryId = category_id || null;
        
        // If category_name is provided in the request body (from frontend)
        if (req.body.category_name && !finalCategoryId) {
            const categoryName = req.body.category_name;
            
            // Check if category exists
            const categoryResult = await pool.query(
                `SELECT id FROM library_schema.peripheral_categories WHERE name ILIKE $1 AND is_deleted = false`,
                [categoryName]
            );
            
            if (categoryResult.rows.length > 0) {
                finalCategoryId = categoryResult.rows[0].id;
                console.log(`Found existing category: ${categoryName} (ID: ${finalCategoryId})`);
            } else {
                // Create new category
                const newCategory = await pool.query(
                    `INSERT INTO library_schema.peripheral_categories (name) VALUES ($1) RETURNING id`,
                    [categoryName]
                );
                finalCategoryId = newCategory.rows[0].id;
                console.log(`Created new category: ${categoryName} (ID: ${finalCategoryId})`);
            }
        }
        
        // Create peripheral
        const result = await pool.query(
            `INSERT INTO library_schema.peripherals 
             (unit_id, category_id, name, brand, model, serial_number, specifications, condition, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [unit_id, finalCategoryId, name, brand || null, model || null, 
             serial_number || null, specifications || null, finalCondition, true]
        );
        
        console.log('✅ Peripheral created successfully:', result.rows[0]);
        
        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'CREATE_PERIPHERAL', JSON.stringify({ peripheral_id: result.rows[0].id, name })]
        );
        
        res.status(201).json({
            success: true,
            message: 'Peripheral created successfully',
            data: { peripheral: result.rows[0] }
        });
        
    } catch (error) {
        console.error('❌ Create peripheral error:', error);
        
        // Handle specific PostgreSQL errors
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ 
                success: false,
                message: 'Serial number already exists' 
            });
        }
        
        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({ 
                success: false,
                message: 'Invalid unit ID. Please select a valid PC unit (1-5).' 
            });
        }
        
        if (error.code === '22P02') { // Invalid input syntax for enum
            return res.status(400).json({ 
                success: false,
                message: `Invalid condition value. Allowed values: good, damaged, repair_needed, missing`,
                details: error.message
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: error.message || 'Failed to create peripheral',
            details: error.detail
        });
    }
};

exports.updatePeripheral = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required' 
            });
        }
        
        const { id } = req.params;
        const updates = req.body;
        
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
        
        if (setClauses.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No fields to update' 
            });
        }
        
        values.push(id);
        const query = `
            UPDATE library_schema.peripherals 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND is_deleted = false
            RETURNING *
        `;
        
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Peripheral not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Peripheral updated successfully',
            data: { peripheral: result.rows[0] }
        });
    } catch (error) {
        console.error('Update peripheral error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update peripheral', 
            error: error.message
        });
    }
};

exports.deletePeripheral = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required' 
            });
        }
        
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE library_schema.peripherals 
             SET is_deleted = true, is_active = false
             WHERE id = $1 AND is_deleted = false
             RETURNING id`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Peripheral not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Peripheral deleted successfully'
        });
    } catch (error) {
        console.error('Delete peripheral error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete peripheral', 
            error: error.message
        });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM library_schema.peripheral_categories 
             WHERE is_deleted = false 
             ORDER BY name`
        );
        res.json({
            success: true,
            message: 'Categories retrieved',
            data: { categories: result.rows }
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve categories', 
            error: error.message
        });
    }
};

exports.createCategory = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required' 
            });
        }
        
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ 
                success: false,
                message: 'Category name required' 
            });
        }
        
        const result = await pool.query(
            `INSERT INTO library_schema.peripheral_categories (name, description)
             VALUES ($1, $2)
             RETURNING *`,
            [name, description || null]
        );
        
        res.status(201).json({
            success: true,
            message: 'Category created',
            data: { category: result.rows[0] }
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create category', 
            error: error.message
        });
    }
};

exports.updateCondition = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required' 
            });
        }
        
        const { id } = req.params;
        const { condition } = req.body;
        
        if (!condition) {
            return res.status(400).json({ 
                success: false,
                message: 'Condition required' 
            });
        }
        
        // Validate condition
        if (!isValidCondition(condition)) {
            return res.status(400).json({ 
                success: false,
                message: `Invalid condition. Allowed values: good, damaged, repair_needed, missing` 
            });
        }
        
        const result = await pool.query(
            `UPDATE library_schema.peripherals 
             SET condition = $1
             WHERE id = $2 AND is_deleted = false
             RETURNING *`,
            [condition, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Peripheral not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Condition updated successfully',
            data: { peripheral: result.rows[0] }
        });
    } catch (error) {
        console.error('Update condition error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update condition', 
            error: error.message
        });
    }
};