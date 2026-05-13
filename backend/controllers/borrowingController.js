const BorrowingModel = require('../models/borrowingModel');
const BookModel = require('../models/bookModel');
const pool = require('../database/db');

exports.getUserBorrowings = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check permission
        if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
            return res.status(403).json({ 
                success: false,
                message: 'Access denied',
                timestamp: new Date().toISOString()
            });
        }
        
        const borrowings = await BorrowingModel.getUserBorrowings(userId);
        
        res.json({
            success: true,
            message: 'User borrowings retrieved',
            data: { borrowings, count: borrowings.length },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get user borrowings error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve borrowings', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.getAllBorrowings = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }
        
        const { limit = 100, offset = 0, status } = req.query;
        const result = await BorrowingModel.getAll(parseInt(limit), parseInt(offset), status);
        
        res.json({
            success: true,
            message: 'All borrowings retrieved',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get all borrowings error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve borrowings', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.borrowBook = async (req, res) => {
    try {
        const { user_id, book_id, due_date } = req.body;
        
        console.log('🔵 BORROW REQUEST:', { user_id, book_id, due_date });
        console.log('🔵 User from token:', req.user);
        
        // Check permission - allow users to borrow books for themselves
        
        if (req.user.role !== 'admin' && parseInt(req.user.id) !== parseInt(user_id)) {
            console.log('❌ Permission denied:', { reqUserId: req.user.id, bodyUserId: user_id });
            return res.status(403).json({ 
                success: false,
                message: 'Access denied - You can only borrow books for yourself',
                timestamp: new Date().toISOString()
            });
        }
        
        console.log('✅ Permission granted');
        
        const borrowing = await BorrowingModel.create(user_id, book_id, due_date, req.user.id);
        
        res.status(201).json({
            success: true,
            message: 'Book borrowed successfully',
            data: { borrowing },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Borrow book error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message || 'Failed to borrow book',
            timestamp: new Date().toISOString()
        });
    }
};

exports.returnBook = async (req, res) => {
    try {
        const { id } = req.params;
        
        const borrowing = await BorrowingModel.returnBook(id, req.user.id);
        
        if (!borrowing) {
            return res.status(404).json({ 
                success: false,
                message: 'Borrowing record not found',
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            message: 'Book returned successfully',
            data: { borrowing, fine: borrowing.fine_amount },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Return book error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message || 'Failed to return book',
            timestamp: new Date().toISOString()
        });
    }
};

exports.getOverdueBooks = async (req, res) => {
    try {
        const overdue = await BorrowingModel.getOverdue();
        
        res.json({
            success: true,
            message: 'Overdue books retrieved',
            data: { overdue, count: overdue.length },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get overdue error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve overdue books', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};