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

module.exports = {
    validateEmail,
    validatePassword,
    validateStudentId,
    validateRequiredFields,
    validateRegistration,
    validateLogin,
};