const pool = require('../database/db');

async function updateDamageSchema() {
    try {
        console.log('🔄 Updating damage_reports schema to support books...');
        
        await pool.query(`
            ALTER TABLE library_schema.damage_reports 
            ADD COLUMN IF NOT EXISTS book_id INTEGER REFERENCES library_schema.books(id) ON DELETE SET NULL;
        `);
        
        console.log('✅ Successfully added book_id column to damage_reports.');
        
        // Let's also check if we need a column to differentiate item types more easily
        await pool.query(`
            ALTER TABLE library_schema.damage_reports 
            ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'hardware';
        `);
        
        console.log('✅ Successfully added item_type column.');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

updateDamageSchema();
