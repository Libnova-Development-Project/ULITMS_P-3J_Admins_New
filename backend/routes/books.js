const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { auth } = require('../middleware/auth');
const { createResourceLimiter, searchLimiter } = require('../middleware/rateLimiter');
const { validateBookCreation, validatePagination } = require('../utils/validators');
const { sendValidationError } = require('../utils/errorHandler');

// Validation middleware for book creation
const validateBookInput = (req, res, next) => {
    const validation = validateBookCreation(req.body);
    if (!validation.valid) {
        return sendValidationError(res, [validation.error]);
    }
    next();
};

// Validation middleware for pagination
const validatePaginationInput = (req, res, next) => {
    const validation = validatePagination(req.query.limit, req.query.offset);
    if (!validation.valid) {
        return sendValidationError(res, [validation.error]);
    }
    req.query.limit = validation.limit;
    req.query.offset = validation.offset;
    next();
};

/**
 * GET /api/books
 * Get all books with pagination
 */
router.get('/', validatePaginationInput, bookController.getAllBooks);

/**
 * GET /api/books/search
 * Search books by title, author, ISBN (rate limited)
 */
router.get('/search', searchLimiter, bookController.searchBooks);

/**
 * GET /api/books/categories
 * Get all book categories
 */
router.get('/categories', bookController.getCategories);

/**
 * GET /api/books/:id
 * Get book by ID
 */
router.get('/:id', bookController.getBookById);

/**
 * POST /api/books
 * Create new book (Admin only, rate limited, validated)
 */
router.post('/', auth, createResourceLimiter, validateBookInput, bookController.createBook);

/**
 * PUT /api/books/:id
 * Update book (Admin only, validated)
 */
router.put('/:id', auth, validateBookInput, bookController.updateBook);

/**
 * DELETE /api/books/:id
 * Delete book (Admin only, soft delete)
 */
router.delete('/:id', auth, bookController.deleteBook);

module.exports = router;
