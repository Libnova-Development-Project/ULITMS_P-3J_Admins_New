const pool = require('../database/db');

async function checkDefaultStatus() {
    try {
        const result = await pool.query(`
            SELECT column_name, column_default, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema = 'library_schema' 
            AND table_name = 'books' 
            AND column_name = 'status'
        `);
        console.table(result.rows);
        
        const sample = await pool.query('SELECT id, title, status FROM library_schema.books LIMIT 5');
        console.table(sample.rows);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDefaultStatus();
