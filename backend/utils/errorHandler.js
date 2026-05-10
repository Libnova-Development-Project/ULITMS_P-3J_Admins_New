/**
 * Centralized Error Handler & Response Formatter
 * Standardizes all API responses for consistency
 */

const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/statusCodes');

/**
 * Format error response
 */
const sendError = (res, statusCode, message, details = null) => {
    const response = {
        success: false,
        status: statusCode,
        message,
        ...(details && { details }),
        timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
};

/**
 * Format success response
 */
const sendSuccess = (res, statusCode, message, data = null) => {
    const response = {
        success: true,
        status: statusCode,
        message,
        ...(data && { data }),
        timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
};

/**
 * Validation error handler
 */
const sendValidationError = (res, errors) => {
    return sendError(
        res,
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_MESSAGES.MISSING_FIELDS,
        { validationErrors: errors }
    );
};

/**
 * Not found error
 */
const sendNotFound = (res, resource = 'Resource') => {
    return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        `${resource} not found`
    );
};

/**
 * Unauthorized error
 */
const sendUnauthorized = (res, message = ERROR_MESSAGES.UNAUTHORIZED_ACCESS) => {
    return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        message
    );
};

/**
 * Forbidden error
 */
const sendForbidden = (res, message = ERROR_MESSAGES.ADMIN_ONLY) => {
    return sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        message
    );
};

/**
 * Conflict error (duplicate entry)
 */
const sendConflict = (res, message = ERROR_MESSAGES.DUPLICATE_ENTRY) => {
    return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        message
    );
};

/**
 * Database error wrapper
 */
const handleDatabaseError = (res, error, context = '') => {
    console.error(`Database Error [${context}]:`, error);

    if (error.code === '23505') { // Unique constraint violation
        return sendConflict(res, 'Duplicate entry detected');
    }

    if (error.code === '23503') { // Foreign key violation
        return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid reference to related record');
    }

    if (error.code === '23502') { // Not null violation
        return sendValidationError(res, [error.column || 'Unknown field']);
    }

    return sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.DATABASE_ERROR
    );
};

/**
 * Async error wrapper for controllers
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        return Promise
            .resolve(fn(req, res, next))
            .catch(error => {
                console.error('Async Handler Error:', error);
                return sendError(
                    res,
                    HTTP_STATUS.INTERNAL_SERVER_ERROR,
                    ERROR_MESSAGES.SERVER_ERROR
                );
            });
    };
};

/**
 * Log API call for debugging
 */
const logApiCall = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });

    next();
};

module.exports = {
    sendError,
    sendSuccess,
    sendValidationError,
    sendNotFound,
    sendUnauthorized,
    sendForbidden,
    sendConflict,
    handleDatabaseError,
    asyncHandler,
    logApiCall,
};
