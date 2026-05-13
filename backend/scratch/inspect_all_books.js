const pool = require('../database/db');

async function inspectAllBooks() {
    try {
        const result = await pool.query('SELECT id, title, author, is_deleted FROM library_schema.books ORDER BY id DESC LIMIT 20');
        console.table(result.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectAllBooks();
