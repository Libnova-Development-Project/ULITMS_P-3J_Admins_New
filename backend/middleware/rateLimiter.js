/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and API abuse
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Auth rate limiter (stricter)
 * 5 login/register attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts. Please try again after 15 minutes.',
    skipSuccessfulRequests: true, // Don't count successful requests
    keyGenerator: (req, res) => {
        // Use email as key if provided (more granular)
        return req.body.email || req.body.identifier || req.ip;
    },
});

/**
 * Borrow/Return rate limiter
 * 20 operations per hour (prevent spam)
 */
const borrowLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: 'Too many borrow/return requests. Please try again later.',
});

/**
 * Create rate limiter
 * Prevent bulk creation of resources
 */
const createResourceLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 creations per hour
    message: 'Too many resource creation requests.',
});

/**
 * Search rate limiter (generous)
 * 200 searches per 15 minutes
 */
const searchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Too many search requests.',
});

module.exports = {
    apiLimiter,
    authLimiter,
    borrowLimiter,
    createResourceLimiter,
    searchLimiter,
};
