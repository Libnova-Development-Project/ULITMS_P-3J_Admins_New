const pool = require('../database/db');

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'library_schema' AND table_name = 'users'
        `);
        console.table(res.rows);
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

checkSchema();
