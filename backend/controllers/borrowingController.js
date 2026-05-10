const BorrowingModel = require('../models/borrowingModel');
const BookModel = require('../models/bookModel');
const pool = require('../database/db');

exports.getUserBorrowings = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check permission
        if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const borrowings = await BorrowingModel.getUserBorrowings(userId);
        
        res.json({
            message: 'User borrowings retrieved',
            count: borrowings.length,
            borrowings
        });
    } catch (error) {
        console.error('Get user borrowings error:', error);
        res.status(500).json({ message: 'Failed to retrieve borrowings', error: error.message });
    }
};

exports.getAllBorrowings = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { limit = 100, offset = 0, status } = req.query;
        const result = await BorrowingModel.getAll(parseInt(limit), parseInt(offset), status);
        
        res.json({
            message: 'All borrowings retrieved',
            ...result
        });
    } catch (error) {
        console.error('Get all borrowings error:', error);
        res.status(500).json({ message: 'Failed to retrieve borrowings', error: error.message });
    }
};

exports.borrowBook = async (req, res) => {
    try {
        const { user_id, book_id, due_date } = req.body;
        
        if (!user_id || !book_id || !due_date) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // Check permission
        if (req.user.role !== 'admin' && req.user.id !== user_id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const borrowing = await BorrowingModel.create(user_id, book_id, due_date, req.user.id);
        
        res.status(201).json({
            message: 'Book borrowed successfully',
            borrowing
        });
    } catch (error) {
        console.error('Borrow book error:', error);
        res.status(500).json({ message: error.message || 'Failed to borrow book' });
    }
};

exports.returnBook = async (req, res) => {
    try {
        const { id } = req.params;
        
        const borrowing = await BorrowingModel.returnBook(id, req.user.id);
        
        if (!borrowing) {
            return res.status(404).json({ message: 'Borrowing record not found' });
        }
        
        res.json({
            message: 'Book returned successfully',
            borrowing,
            fine: borrowing.fine_amount
        });
    } catch (error) {
        console.error('Return book error:', error);
        res.status(500).json({ message: error.message || 'Failed to return book' });
    }
};

exports.getOverdueBooks = async (req, res) => {
    try {
        const overdue = await BorrowingModel.getOverdue();
        
        res.json({
            message: 'Overdue books retrieved',
            count: overdue.length,
            overdue
        });
    } catch (error) {
        console.error('Get overdue error:', error);
        res.status(500).json({ message: 'Failed to retrieve overdue books', error: error.message });
    }
};