const pool = require('../database/db');

async function updateSchema() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('🚀 Updating database schema...');
        
        // Add profile_picture column to users
        await client.query(`
            ALTER TABLE library_schema.users 
            ADD COLUMN IF NOT EXISTS profile_picture TEXT
        `);
        console.log('✅ Added profile_picture column to users');

        // Create notifications table
        await client.query(`
            CREATE TABLE IF NOT EXISTS library_schema.notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES library_schema.users(id),
                title VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(20) DEFAULT 'info', -- info, success, warning, error
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created notifications table');

        // Add some dummy notifications for the user
        // I'll get the current user ID from a previous interaction or just add for common IDs
        const userRes = await client.query('SELECT id FROM library_schema.users WHERE is_deleted = false LIMIT 5');
        for (const row of userRes.rows) {
            await client.query(`
                INSERT INTO library_schema.notifications (user_id, title, message, type)
                VALUES ($1, $2, $3, $4)
            `, [row.id, 'Welcome to ULITMS', 'Welcome to your new library dashboard!', 'success']);
            
            await client.query(`
                INSERT INTO library_schema.notifications (user_id, title, message, type)
                VALUES ($1, $2, $3, $4)
            `, [row.id, 'Profile Incomplete', 'Please update your contact information in your profile.', 'warning']);
        }
        console.log('✅ Added dummy notifications');

        await client.query('COMMIT');
        console.log('✨ Schema update complete.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error updating schema:', error);
    } finally {
        client.release();
        process.exit();
    }
}

updateSchema();
