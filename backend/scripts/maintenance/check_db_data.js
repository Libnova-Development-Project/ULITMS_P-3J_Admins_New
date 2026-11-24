const pool = require('../../src/config/database');

async function checkData() {
    try {
        console.log('--- Checking Books ---');
        const books = await pool.query('SELECT title, available_copies, total_copies FROM library_schema.books WHERE is_deleted = false');
        console.table(books.rows);

        console.log('--- Checking Active Borrowings ---');
        const borrowings = await pool.query(`
            SELECT bt.id, u.first_name, b.title, bt.status 
            FROM library_schema.borrow_transactions bt
            JOIN library_schema.users u ON bt.user_id = u.id
            JOIN library_schema.books b ON bt.book_id = b.id
            WHERE bt.status = 'borrowed' AND bt.is_deleted = false
        `);
        console.table(borrowings.rows);

        console.log('--- Checking E-Library Units ---');
        const units = await pool.query('SELECT unit_number, status FROM library_schema.elibrary_units');
        console.table(units.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
