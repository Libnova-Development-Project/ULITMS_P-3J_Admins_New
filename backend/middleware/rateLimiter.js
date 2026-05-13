/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and API abuse
 */

const rateLimit = require('express-rate-limit');

// Helper to send JSON error instead of plain text
const jsonHandler = (req, res, next, options) => {
    res.status(options.statusCode).json({
        success: false,
        message: options.message,
        timestamp: new Date().toISOString()
    });
};

/**
 * General API rate limiter
 * Increased to 1000 requests per 15 minutes for development/active use
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased from 100
    message: 'Too many requests from this IP, please try again later.',
    handler: jsonHandler,
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Auth rate limiter
 * Increased to 50 attempts per 15 minutes
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Increased from 5
    message: 'Too many login attempts. Please try again after 15 minutes.',
    handler: jsonHandler,
    skipSuccessfulRequests: true,
    keyGenerator: (req, res) => {
        return req.body.email || req.body.identifier || req.ip;
    },
});

/**
 * Borrow/Return rate limiter
 */
const borrowLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Increased from 20
    message: 'Too many borrow/return requests. Please try again later.',
    handler: jsonHandler,
});

/**
 * Create rate limiter
 */
const createResourceLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 200, // Increased from 50
    message: 'Too many resource creation requests.',
    handler: jsonHandler,
});

/**
 * Search rate limiter
 */
const searchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500, // Increased from 200
    message: 'Too many search requests.',
    handler: jsonHandler,
});

module.exports = {
    apiLimiter,
    authLimiter,
    borrowLimiter,
    createResourceLimiter,
    searchLimiter,
};
