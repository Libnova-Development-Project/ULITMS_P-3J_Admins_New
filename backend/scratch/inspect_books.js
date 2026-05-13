const pool = require('../database/db');

async function inspectBooks() {
    try {
        const result = await pool.query('SELECT id, title, author, is_deleted FROM library_schema.books WHERE is_deleted = false ORDER BY id DESC');
        console.table(result.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectBooks();
