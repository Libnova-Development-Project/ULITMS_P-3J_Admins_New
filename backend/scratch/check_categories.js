const pool = require('../database/db');

async function checkCategories() {
    try {
        const result = await pool.query('SELECT * FROM library_schema.book_categories');
        console.table(result.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCategories();
