const pool = require('../database/db');

async function testAddBook() {
    try {
        const bookData = {
            isbn: '9999999999',
            title: 'Test Bug Book',
            author: 'Bug Finder',
            publisher: 'Bug Press',
            publication_year: 2024,
            category_id: 1,
            total_copies: 5,
            description: 'Testing why books dont appear',
            cover_image_url: '',
            metadata: {}
        };
        
        const result = await pool.query(
            `INSERT INTO library_schema.books 
             (isbn, title, author, publisher, publication_year, category_id,
              total_copies, available_copies, description, cover_image_url, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [bookData.isbn, bookData.title, bookData.author, bookData.publisher, bookData.publication_year, bookData.category_id,
             bookData.total_copies, bookData.total_copies, bookData.description, bookData.cover_image_url, bookData.metadata]
        );
        
        console.log('Book added with ID:', result.rows[0].id);
        
        const getAll = await pool.query('SELECT id, title, is_deleted FROM library_schema.books WHERE is_deleted = false ORDER BY title ASC');
        console.table(getAll.rows);
        console.log('Total count from DB:', getAll.rows.length);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testAddBook();
