const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateRegistration, validateLogin } = require('../utils/validators');
const { sendValidationError } = require('../utils/errorHandler');

// Validation middleware for registration
const validateRegisterInput = (req, res, next) => {
    const validation = validateRegistration(req.body);
    if (!validation.valid) {
        return sendValidationError(res, [validation.error]);
    }
    next();
};

// Validation middleware for login
const validateLoginInput = (req, res, next) => {
    const validation = validateLogin(req.body);
    if (!validation.valid) {
        return sendValidationError(res, [validation.error]);
    }
    next();
};

/**
 * POST /api/auth/register
 * Register a new user with input validation
 */
router.post('/register', authLimiter, validateRegisterInput, authController.register);

/**
 * POST /api/auth/login
 * Login user and return JWT token with rate limiting
 */
router.post('/login', authLimiter, validateLoginInput, authController.login);

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', authController.logout);

module.exports = router;