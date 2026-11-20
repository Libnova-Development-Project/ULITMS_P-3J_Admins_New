const pool = require('../database/db');

class BorrowingModel {
    // 1. Create borrowing transaction - Tawagon ang Database Function
    static async create(userId, bookId, dueDate, processedBy = null) {
        try {
            console.log('📚 Creating borrowing via DB function:', { userId, bookId, dueDate });
            
            // Gitawag na direkta ang advanced SQL function
            const result = await pool.query(
                `SELECT library_schema.fn_borrow_book($1, $2, $3, $4) AS transaction_id`,
                [userId, bookId, dueDate, processedBy]
            );
            
            const transactionId = result.rows[0].transaction_id;
            console.log('✅ Borrowing record created via DB function, ID:', transactionId);
            
            return await this.findById(transactionId);
        } catch (error) {
            console.error('❌ Borrow error:', error.message);
            throw error;
        }
    }

    // 2. Request return (Student) - Tawagon ang Database Function
    static async returnBook(borrowingId, returnedBy = null) {
        const borrowing = await this.findById(borrowingId);
        if (!borrowing) {
            throw new Error('Borrowing record not found');
        }

        // Gitawag ang function para sa pag-request sa return
        await pool.query(
            `SELECT library_schema.fn_request_book_return($1, $2)`,
            [borrowingId, returnedBy || borrowing.user_id]
        );

        return await this.findById(borrowingId);
    }

    // 3. Confirm return (Admin) - Tawagon ang Database Procedure
    static async confirmReturn(borrowingId, processedBy = null) {
        try {
            // Gitawag ang stored procedure para sa pag-confirm ug pag-compute sa fine
            await pool.query(
                `CALL library_schema.sp_confirm_book_return($1, $2, 0.00)`,
                [borrowingId, processedBy]
            );
            
            return await this.findById(borrowingId);
        } catch (error) {
            console.error('Confirm return error:', error);
            throw error;
        }
    }

    // Get user's borrowings (Query lang kini para sa pagbasa sa records)
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