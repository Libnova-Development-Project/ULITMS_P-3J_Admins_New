const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const auth = require('../middleware/auth');

// Get all books
router.get('/', bookController.getAllBooks);

// Get book by ID
router.get('/:id', bookController.getBookById);

// Create book (Admin only)
router.post('/', auth, bookController.createBook);

// Update book (Admin only)
router.put('/:id', auth, bookController.updateBook);

// Delete book (Admin only)
router.delete('/:id', auth, bookController.deleteBook);

// Search books
router.get('/search/query', bookController.searchBooks);

module.exports = router;
