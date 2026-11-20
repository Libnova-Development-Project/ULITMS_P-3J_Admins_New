const pool = require('../../src/config/database');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Updating borrow_status enum...');
        await client.query("ALTER TYPE library_schema.borrow_status ADD VALUE IF NOT EXISTS 'pending_return'");
        console.log('✅ Added pending_return to borrow_status enum');
    } catch (error) {
        console.error('❌ Error updating enum:', error);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
