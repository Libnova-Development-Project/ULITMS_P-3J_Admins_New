const BookModel = require('../models/bookModel');
const pool = require('../database/db');
const { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/statusCodes');

exports.getAllBooks = async (req, res) => {
    try {
        const { category, status, search, limit = 100, offset = 0 } = req.query;
        
        const filters = { category_id: category, status, search };
        const result = await BookModel.getAll(filters, parseInt(limit), parseInt(offset));
        
        res.json({
            success: true,
            message: 'Books retrieved successfully',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve books', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.getBookById = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await BookModel.findById(id);
        
        if (!book) {
            return res.status(404).json({ 
                success: false,
                message: 'Book not found',
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            message: 'Book retrieved successfully',
            data: { book },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get book error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve book', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.createBook = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }
        
        const {
            isbn, title, author, publisher, publication_year,
            category_id, total_copies, description, cover_image_url, metadata
        } = req.body;
        
        if (!title || !author || !total_copies) {
            return res.status(400).json({ 
                success: false,
                message: 'Title, author, and total copies are required',
                timestamp: new Date().toISOString()
            });
        }
        
        // Check if ISBN exists
        if (isbn) {
            const existingBook = await BookModel.findByIsbn(isbn);
            if (existingBook) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Book with this ISBN already exists',
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        let finalCategoryId = category_id;
        
        // If no category_id but category_name is provided, try to find it
        if (!finalCategoryId && req.body.category_name) {
            const catResult = await pool.query(
                'SELECT id FROM library_schema.book_categories WHERE name ILIKE $1',
                [req.body.category_name.trim()]
            );
            if (catResult.rows.length > 0) {
                finalCategoryId = catResult.rows[0].id;
            }
        }

        const book = await BookModel.create({
            isbn, title, author, publisher, publication_year,
            category_id: finalCategoryId, total_copies, description, cover_image_url, metadata
        });
        
        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'CREATE_BOOK', JSON.stringify({ book_id: book.id, title: book.title })]
        );
        
        res.status(201).json({
            success: true,
            message: 'Book created successfully',
            data: { book },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create book', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.updateBook = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }
        
        const { id } = req.params;
        const updates = req.body;
        
        const book = await BookModel.update(id, updates);
        if (!book) {
            return res.status(404).json({ 
                success: false,
                message: 'Book not found',
                timestamp: new Date().toISOString()
            });
        }
        
        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'UPDATE_BOOK', JSON.stringify({ book_id: id, updates })]
        );
        
        res.json({
            success: true,
            message: 'Book updated successfully',
            data: { book },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update book', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.deleteBook = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }
        
        const { id } = req.params;
        const book = await BookModel.delete(id);
        
        if (!book) {
            return res.status(404).json({ 
                success: false,
                message: 'Book not found',
                timestamp: new Date().toISOString()
            });
        }
        
        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'DELETE_BOOK', JSON.stringify({ book_id: id })]
        );
        
        res.json({
            success: true,
            message: 'Book deleted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete book', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.searchBooks = async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ 
                success: false,
                message: 'Search query is required',
                timestamp: new Date().toISOString()
            });
        }
        
        const result = await BookModel.getAll({ search: query }, 50, 0);
        
        res.json({
            success: true,
            message: 'Search results',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Search books error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Search failed', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const categories = await BookModel.getCategories();
        res.json({
            success: true,
            message: 'Categories retrieved',
            data: { categories },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve categories', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};