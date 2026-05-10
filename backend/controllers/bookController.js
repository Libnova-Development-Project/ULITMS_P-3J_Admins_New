const BookModel = require('../models/bookModel');
const pool = require('../database/db');

exports.getAllBooks = async (req, res) => {
    try {
        const { category, status, search, limit = 100, offset = 0 } = req.query;
        
        const filters = { category_id: category, status, search };
        const result = await BookModel.getAll(filters, parseInt(limit), parseInt(offset));
        
        res.json({
            message: 'Books retrieved successfully',
            ...result
        });
    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ message: 'Failed to retrieve books', error: error.message });
    }
};

exports.getBookById = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await BookModel.findById(id);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        res.json({
            message: 'Book retrieved successfully',
            book
        });
    } catch (error) {
        console.error('Get book error:', error);
        res.status(500).json({ message: 'Failed to retrieve book', error: error.message });
    }
};

exports.createBook = async (req, res) => {
    try {
        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const {
            isbn, title, author, publisher, publication_year,
            category_id, total_copies, description, cover_image_url, metadata
        } = req.body;
        
        if (!title || !author || !total_copies) {
            return res.status(400).json({ message: 'Title, author, and total copies are required' });
        }
        
        // Check if ISBN exists
        if (isbn) {
            const existingBook = await BookModel.findByIsbn(isbn);
            if (existingBook) {
                return res.status(400).json({ message: 'Book with this ISBN already exists' });
            }
        }
        
        const book = await BookModel.create({
            isbn, title, author, publisher, publication_year,
            category_id, total_copies, description, cover_image_url, metadata
        });
        
        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'CREATE_BOOK', { book_id: book.id, title: book.title }]
        );
        
        res.status(201).json({
            message: 'Book created successfully',
            book
        });
    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({ message: 'Failed to create book', error: error.message });
    }
};

exports.updateBook = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { id } = req.params;
        const updates = req.body;
        
        const book = await BookModel.update(id, updates);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'UPDATE_BOOK', { book_id: id, updates }]
        );
        
        res.json({
            message: 'Book updated successfully',
            book
        });
    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({ message: 'Failed to update book', error: error.message });
    }
};

exports.deleteBook = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { id } = req.params;
        const book = await BookModel.delete(id);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'DELETE_BOOK', { book_id: id }]
        );
        
        res.json({
            message: 'Book deleted successfully'
        });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({ message: 'Failed to delete book', error: error.message });
    }
};

exports.searchBooks = async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        
        const result = await BookModel.getAll({ search: query }, 50, 0);
        
        res.json({
            message: 'Search results',
            count: result.total,
            books: result.books
        });
    } catch (error) {
        console.error('Search books error:', error);
        res.status(500).json({ message: 'Search failed', error: error.message });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const categories = await BookModel.getCategories();
        res.json({
            message: 'Categories retrieved',
            categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ message: 'Failed to retrieve categories', error: error.message });
    }
};