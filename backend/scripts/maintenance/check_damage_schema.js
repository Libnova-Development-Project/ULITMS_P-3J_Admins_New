const pool = require('../../src/config/database');

async function checkDamageSchema() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'library_schema' 
            AND table_name = 'damage_reports'
        `);
        console.log('--- Damage Reports Schema ---');
        console.table(result.rows);
        
        // Also check if we can link to books
        const constraints = await pool.query(`
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE n.nspname = 'library_schema' AND conrelid = 'library_schema.damage_reports'::regclass;
        `);
        console.log('--- Constraints ---');
        console.table(constraints.rows);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDamageSchema();
