const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateRegistration, validateLogin } = require('../utils/validators');
const { sendValidationError } = require('../utils/errorHandler');

/**
 * POST /api/auth/register
 * Register a new user with input validation
 */
router.post('/register', authLimiter, (req, res, next) => {
    const validation = validateRegistration(req.body);
    if (!validation.valid) {
        return sendValidationError(res, [validation.error]);
    }
    next();
}, authController.register);

/**
 * POST /api/auth/login
 * Login user and return JWT token with rate limiting
 */
router.post('/login', authLimiter, (req, res, next) => {
    const validation = validateLogin(req.body);
    if (!validation.valid) {
        return sendValidationError(res, [validation.error]);
    }
    next();
}, authController.login);

module.exports = router;
