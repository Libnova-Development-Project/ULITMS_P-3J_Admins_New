/**
 * HTTP Status Codes & Error Messages
 * Centralized constants for consistent API responses
 */

const HTTP_STATUS = {
    // Success
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,

    // Client Errors
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,

    // Server Errors
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    SERVICE_UNAVAILABLE: 503,
};

const ERROR_MESSAGES = {
    // Auth
    INVALID_CREDENTIALS: 'Invalid email or password',
    TOKEN_EXPIRED: 'Token has expired',
    INVALID_TOKEN: 'Invalid or malformed token',
    NO_TOKEN: 'No authentication token provided',
    UNAUTHORIZED_ACCESS: 'Unauthorized access',
    ADMIN_ONLY: 'Admin access required',

    // Validation
    MISSING_FIELDS: 'Missing required fields',
    INVALID_EMAIL: 'Invalid email format',
    INVALID_PASSWORD: 'Password must be at least 8 characters',
    PASSWORD_MISMATCH: 'Passwords do not match',
    INVALID_ISBN: 'Invalid ISBN format',
    INVALID_STUDENT_ID: 'Invalid student ID format',

    // Database
    EMAIL_EXISTS: 'Email already registered',
    STUDENT_ID_EXISTS: 'Student ID already registered',
    NOT_FOUND: 'Resource not found',
    DUPLICATE_ENTRY: 'Duplicate entry detected',

    // Books
    BOOK_NOT_FOUND: 'Book not found',
    INSUFFICIENT_COPIES: 'Insufficient copies available',
    BOOK_NOT_AVAILABLE: 'Book is not available for borrowing',

    // Users
    USER_NOT_FOUND: 'User not found',
    USER_INACTIVE: 'User account is inactive',

    // Borrowing
    BORROW_LIMIT_EXCEEDED: 'Borrowing limit exceeded',
    OVERDUE_BOOKS: 'You have overdue books',
    ACTIVE_BORROWING: 'Book already borrowed by user',

    // Server
    DATABASE_ERROR: 'Database error occurred',
    SERVER_ERROR: 'Internal server error',
};

const SUCCESS_MESSAGES = {
    CREATED: 'Resource created successfully',
    UPDATED: 'Resource updated successfully',
    DELETED: 'Resource deleted successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    PASSWORD_CHANGED: 'Password changed successfully',
    EMAIL_VERIFIED: 'Email verified successfully',
};

module.exports = {
    HTTP_STATUS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
};
