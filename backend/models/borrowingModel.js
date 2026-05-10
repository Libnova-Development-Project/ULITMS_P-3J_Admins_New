const pool = require('../database/db');

class BorrowingModel {
    // Create borrowing transaction
    static async create(userId, bookId, dueDate, processedBy = null) {
        // Start transaction
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Check book availability
            const book = await client.query(
                `SELECT * FROM library_schema.books 
                 WHERE id = $1 AND is_deleted = false AND available_copies > 0`,
                [bookId]
            );
            
            if (book.rows.length === 0) {
                throw new Error('Book not available');
            }
            
            // Create borrowing record
            const result = await client.query(
                `INSERT INTO library_schema.borrow_transactions 
                 (user_id, book_id, due_date, processed_by)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [userId, bookId, dueDate, processedBy]
            );
            
            // Update book availability
            await client.query(
                `UPDATE library_schema.books 
                 SET available_copies = available_copies - 1
                 WHERE id = $1`,
                [bookId]
            );
            
            // Log activity
            await client.query(
                `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
                 VALUES ($1, $2, $3)`,
                [userId, 'BORROW_BOOK', { book_id: bookId, due_date: dueDate }]
            );
            
            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Return book
    static async returnBook(borrowingId, returnedBy = null) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get borrowing record
            const borrowing = await client.query(
                `SELECT * FROM library_schema.borrow_transactions 
                 WHERE id = $1 AND status = 'borrowed' AND is_deleted = false`,
                [borrowingId]
            );
            
            if (borrowing.rows.length === 0) {
                throw new Error('Borrowing record not found or already returned');
            }
            
            // Calculate fine if overdue
            let fine = 0;
            const dueDate = new Date(borrowing.rows[0].due_date);
            const today = new Date();
            
            if (today > dueDate) {
                const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                fine = daysOverdue * 10; // ₱10 per day
            }
            
            // Update borrowing record
            const result = await client.query(
                `UPDATE library_schema.borrow_transactions 
                 SET returned_at = CURRENT_TIMESTAMP, 
                     status = 'returned',
                     fine_amount = $1,
                     processed_by = $2
                 WHERE id = $3
                 RETURNING *`,
                [fine, returnedBy, borrowingId]
            );
            
            // Update book availability
            await client.query(
                `UPDATE library_schema.books 
                 SET available_copies = available_copies + 1
                 WHERE id = $1`,
                [borrowing.rows[0].book_id]
            );
            
            // Log activity
            await client.query(
                `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
                 VALUES ($1, $2, $3)`,
                [borrowing.rows[0].user_id, 'RETURN_BOOK', { borrowing_id: borrowingId, fine }]
            );
            
            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get user's borrowings
    static async getUserBorrowings(userId) {
        const result = await pool.query(
            `SELECT bt.*, b.title, b.author, b.isbn
             FROM library_schema.borrow_transactions bt
             JOIN library_schema.books b ON bt.book_id = b.id
             WHERE bt.user_id = $1 AND bt.is_deleted = false
             ORDER BY bt.borrowed_at DESC`,
            [userId]
        );
        return result.rows;
    }

    // Get all borrowings (admin)
    static async getAll(limit = 100, offset = 0, status = null) {
        let query = `
            SELECT bt.*, 
                   u.first_name, u.last_name, u.student_id,
                   b.title, b.author, b.isbn
            FROM library_schema.borrow_transactions bt
            JOIN library_schema.users u ON bt.user_id = u.id
            JOIN library_schema.books b ON bt.book_id = b.id
            WHERE bt.is_deleted = false
        `;
        const values = [];
        let paramIndex = 1;
        
        if (status) {
            query += ` AND bt.status = $${paramIndex}`;
            values.push(status);
            paramIndex++;
        }
        
        query += ` ORDER BY bt.borrowed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);
        
        const result = await pool.query(query, values);
        
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM library_schema.borrow_transactions WHERE is_deleted = false`
        );
        
        return {
            borrowings: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit,
            offset
        };
    }

    // Get overdue borrowings
    static async getOverdue() {
        const result = await pool.query(
            `SELECT bt.*, 
                    u.first_name, u.last_name, u.email, u.student_id,
                    b.title, b.author
             FROM library_schema.borrow_transactions bt
             JOIN library_schema.users u ON bt.user_id = u.id
             JOIN library_schema.books b ON bt.book_id = b.id
             WHERE bt.status = 'borrowed' 
               AND bt.due_date < CURRENT_DATE
               AND bt.is_deleted = false
             ORDER BY bt.due_date ASC`,
            []
        );
        return result.rows;
    }

    // Get borrowing by ID
    static async findById(id) {
        const result = await pool.query(
            `SELECT bt.*, 
                    u.first_name, u.last_name, u.student_id,
                    b.title, b.author
             FROM library_schema.borrow_transactions bt
             JOIN library_schema.users u ON bt.user_id = u.id
             JOIN library_schema.books b ON bt.book_id = b.id
             WHERE bt.id = $1 AND bt.is_deleted = false`,
            [id]
        );
        return result.rows[0];
    }
}

module.exports = BorrowingModel;