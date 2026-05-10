/**
 * Input Validators
 * Centralized validation functions for all API inputs
 */

const { ERROR_MESSAGES } = require('../constants/statusCodes');

/**
 * Email validation
 */
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Password validation (min 8 chars, uppercase, lowercase, number)
 */
const validatePassword = (password) => {
    if (!password || password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    return true;
};

/**
 * Student ID validation (format: YYYY-XXXXX)
 */
const validateStudentId = (studentId) => {
    const studentIdRegex = /^\d{4}-\d{5}$|^[A-Z0-9]{6,10}$/;
    return studentIdRegex.test(studentId);
};

/**
 * ISBN validation (10 or 13 digits)
 */
const validateISBN = (isbn) => {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    return /^\d{10}$|^\d{13}$/.test(cleanISBN);
};

/**
 * Phone number validation
 */
const validatePhoneNumber = (phone) => {
    const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10,}$/;
    return phoneRegex.test(phone);
};

/**
 * Year level validation
 */
const validateYearLevel = (year) => {
    const validYears = [1, 2, 3, 4];
    return validYears.includes(parseInt(year));
};

/**
 * Validate required fields
 */
const validateRequiredFields = (data, requiredFields) => {
    const missing = requiredFields.filter(field => !data[field] || data[field].toString().trim() === '');
    if (missing.length > 0) {
        return {
            valid: false,
            error: `Missing required fields: ${missing.join(', ')}`,
        };
    }
    return { valid: true };
};

/**
 * Validate registration data
 */
const validateRegistration = (data) => {
    const { student_id, first_name, last_name, email, password, contact_number } = data;

    // Check required fields
    const required = validateRequiredFields(data, ['student_id', 'first_name', 'last_name', 'email', 'password']);
    if (!required.valid) return required;

    // Validate email
    if (!validateEmail(email)) {
        return { valid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
    }

    // Validate password
    if (!validatePassword(password)) {
        return { valid: false, error: ERROR_MESSAGES.INVALID_PASSWORD };
    }

    // Validate student ID
    if (!validateStudentId(student_id)) {
        return { valid: false, error: ERROR_MESSAGES.INVALID_STUDENT_ID };
    }

    // Validate phone if provided
    if (contact_number && !validatePhoneNumber(contact_number)) {
        return { valid: false, error: 'Invalid phone number format' };
    }

    return { valid: true };
};

/**
 * Validate login data
 */
const validateLogin = (data) => {
    const { identifier, password } = data;

    const required = validateRequiredFields(data, ['identifier', 'password']);
    if (!required.valid) return required;

    return { valid: true };
};

/**
 * Validate book creation
 */
const validateBookCreation = (data) => {
    const { title, author, isbn, category, available_copies } = data;

    const required = validateRequiredFields(data, ['title', 'author', 'isbn', 'category', 'available_copies']);
    if (!required.valid) return required;

    if (!validateISBN(isbn)) {
        return { valid: false, error: ERROR_MESSAGES.INVALID_ISBN };
    }

    if (isNaN(available_copies) || available_copies < 0) {
        return { valid: false, error: 'Available copies must be a positive number' };
    }

    return { valid: true };
};

/**
 * Validate borrowing request
 */
const validateBorrowingRequest = (data) => {
    const { book_id, user_id } = data;

    const required = validateRequiredFields(data, ['book_id', 'user_id']);
    if (!required.valid) return required;

    return { valid: true };
};

/**
 * Validate pagination params
 */
const validatePagination = (limit, offset) => {
    const parsedLimit = parseInt(limit) || 10;
    const parsedOffset = parseInt(offset) || 0;

    if (parsedLimit < 1 || parsedLimit > 100) {
        return { valid: false, error: 'Limit must be between 1 and 100' };
    }

    if (parsedOffset < 0) {
        return { valid: false, error: 'Offset must be non-negative' };
    }

    return { valid: true, limit: parsedLimit, offset: parsedOffset };
};

module.exports = {
    validateEmail,
    validatePassword,
    validateStudentId,
    validateISBN,
    validatePhoneNumber,
    validateYearLevel,
    validateRequiredFields,
    validateRegistration,
    validateLogin,
    validateBookCreation,
    validateBorrowingRequest,
    validatePagination,
};
