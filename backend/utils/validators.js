const { ERROR_MESSAGES } = require('../constants/statusCodes');

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    if (!password || password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    return true;
};

const validateStudentId = (studentId) => {
    // Accept both formats: YYYY-12345 OR YY-B-XXXXX
    const oldFormat = /^\d{4}-\d{5}$/;
    const newFormat = /^\d{2}-[A-Za-z]-\d{5}$/;
    return oldFormat.test(studentId) || newFormat.test(studentId);
};

const validatePhoneNumber = (phone) => {
    const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10,}$/;
    return phoneRegex.test(phone);
};

const validateYearLevel = (year) => {
    const validYears = [1, 2, 3, 4];
    return validYears.includes(parseInt(year));
};

const validateISBN = (isbn) => {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    return /^\d{10}$|^\d{13}$/.test(cleanISBN);
};

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

const validateRegistration = (data) => {
    const { student_id, first_name, last_name, email, password } = data;

    const required = validateRequiredFields(data, ['student_id', 'first_name', 'last_name', 'email', 'password']);
    if (!required.valid) return required;

    if (!validateEmail(email)) {
        return { valid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
    }

    if (!validateStudentId(student_id)) {
        return { valid: false, error: 'Student ID must be in format: YYYY-12345 OR YY-B-XXXXX' };
    }

    return { valid: true };
};

const validateLogin = (data) => {
    const { identifier, password } = data;

    const required = validateRequiredFields(data, ['identifier', 'password']);
    if (!required.valid) return required;

    return { valid: true };
};

// ============================================
// CRITICAL FIX: Add the missing function
// ============================================
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

const validateBookCreation = (data) => {
    const { title, author, total_copies } = data;

    const required = validateRequiredFields(data, ['title', 'author', 'total_copies']);
    if (!required.valid) return required;

    if (total_copies && (isNaN(total_copies) || total_copies < 0)) {
        return { valid: false, error: 'Total copies must be a positive number' };
    }

    return { valid: true };
};

const validateBorrowingRequest = (data) => {
    const { book_id, user_id, due_date } = data;

    const required = validateRequiredFields(data, ['book_id', 'user_id', 'due_date']);
    if (!required.valid) return required;

    return { valid: true };
};

module.exports = {
    validateEmail,
    validatePassword,
    validateStudentId,
    validatePhoneNumber,
    validateYearLevel,
    validateISBN,
    validateRequiredFields,
    validateRegistration,
    validateLogin,
    validatePagination,      // ← ADDED THIS
    validateBookCreation,
    validateBorrowingRequest,
};