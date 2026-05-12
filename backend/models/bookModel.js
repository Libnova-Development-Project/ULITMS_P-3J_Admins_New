const pool = require('../database/db');

class BookModel {
    // Create book
    static async create(bookData) {
        const {
            isbn, title, author, publisher, publication_year,
            category_id, total_copies, description, cover_image_url, metadata
        } = bookData;

        const result = await pool.query(
            `INSERT INTO library_schema.books 
             (isbn, title, author, publisher, publication_year, category_id,
              total_copies, available_copies, description, cover_image_url, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [isbn, title, author, publisher, publication_year, category_id,
             total_copies, total_copies, description, cover_image_url, metadata]
        );
        
        return result.rows[0];
    }

    // Get all books (only non-deleted)
    static async getAll(filters = {}, limit = 100, offset = 0) {
        let query = `
            SELECT b.*, bc.name as category_name
            FROM library_schema.books b
            LEFT JOIN library_schema.book_categories bc ON b.category_id = bc.id
            WHERE b.is_deleted = false
        `;
        const values = [];
        let paramIndex = 1;

        if (filters.category_id) {
            query += ` AND b.category_id = $${paramIndex}`;
            values.push(filters.category_id);
            paramIndex++;
        }

        if (filters.status) {
            query += ` AND b.status = $${paramIndex}`;
            values.push(filters.status);
            paramIndex++;
        }

        if (filters.search) {
            query += ` AND (b.title ILIKE $${paramIndex} OR b.author ILIKE $${paramIndex} OR b.isbn ILIKE $${paramIndex})`;
            values.push(`%${filters.search}%`);
            paramIndex++;
        }

        query += ` ORDER BY b.title ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        const result = await pool.query(query, values);
        
        // Get total count (only non-deleted)
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM library_schema.books WHERE is_deleted = false`
        );
        
        return {
            books: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit,
            offset
        };
    }

    // Get book by ID (only non-deleted)
    static async findById(id) {
        const result = await pool.query(
            `SELECT b.*, bc.name as category_name
             FROM library_schema.books b
             LEFT JOIN library_schema.book_categories bc ON b.category_id = bc.id
             WHERE b.id = $1 AND b.is_deleted = false`,
            [id]
        );
        return result.rows[0];
    }

    // Get book by ISBN (only non-deleted)
    static async findByIsbn(isbn) {
        const result = await pool.query(
            `SELECT * FROM library_schema.books 
             WHERE isbn = $1 AND is_deleted = false`,
            [isbn]
        );
        return result.rows[0];
    }

    // Update book
    static async update(id, updates) {
        const allowedFields = ['title', 'author', 'isbn', 'publisher', 
                               'publication_year', 'category_id', 'description',
                               'cover_image_url', 'metadata', 'status'];
        const setClauses = [];
        const values = [];
        let paramIndex = 1;
        
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                setClauses.push(`${field} = $${paramIndex}`);
                values.push(updates[field]);
                paramIndex++;
            }
        }
        
        if (updates.total_copies !== undefined) {
            setClauses.push(`total_copies = $${paramIndex}, available_copies = available_copies + $${paramIndex + 1}`);
            values.push(updates.total_copies, updates.total_copies - (updates.current_total || updates.total_copies));
            paramIndex += 2;
        }
        
        if (setClauses.length === 0) return null;
        
        values.push(id);
        const query = `
            UPDATE library_schema.books 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND is_deleted = false
            RETURNING *
        `;
        
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Delete book (soft delete - only mark as deleted)
    static async delete(id) {
        const result = await pool.query(
            `UPDATE library_schema.books 
             SET is_deleted = true
             WHERE id = $1 AND is_deleted = false
             RETURNING id`,
            [id]
        );
        return result.rows[0];
    }

    // Update available copies (when borrowed/returned)
    static async updateAvailability(id, change) {
        const result = await pool.query(
            `UPDATE library_schema.books 
             SET available_copies = available_copies + $1,
                 status = CASE 
                     WHEN available_copies + $1 <= 0 THEN 'borrowed'
                     ELSE 'available'
                 END
             WHERE id = $2 AND is_deleted = false
             RETURNING *`,
            [change, id]
        );
        return result.rows[0];
    }

    // Get book categories (only non-deleted)
    static async getCategories() {
        const result = await pool.query(
            `SELECT * FROM library_schema.book_categories 
             WHERE is_deleted = false 
             ORDER BY name`
        );
        return result.rows;
    }

    // Create category
    static async createCategory(name, description) {
        const result = await pool.query(
            `INSERT INTO library_schema.book_categories (name, description)
             VALUES ($1, $2)
             RETURNING *`,
            [name, description]
        );
        return result.rows[0];
    }
}

module.exports = BookModel;