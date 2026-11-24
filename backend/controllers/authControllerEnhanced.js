/**
 * Enhanced Auth Controller with Error Handling
 * Improved version with standardized responses and better error management
 */

const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');
const {
    sendError,
    sendSuccess,
    sendConflict,
    handleDatabaseError,
    asyncHandler,
} = require('../utils/errorHandler');
const { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/statusCodes');

/**
 * POST /api/auth/register
 * Register a new student or admin account
 * @note Input validation is handled by route middleware
 */
exports.register = asyncHandler(async (req, res) => {
    const {
        student_id, first_name, middle_name, last_name, email,
        password, contact_number, course, year_level
    } = req.body;

    try {
        // Check if email already exists
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            return sendConflict(res, ERROR_MESSAGES.EMAIL_EXISTS);
        }

        // Check if student ID already exists
        const existingStudent = await UserModel.findByStudentId(student_id);
        if (existingStudent) {
            return sendConflict(res, ERROR_MESSAGES.STUDENT_ID_EXISTS);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = await UserModel.create({
            student_id,
            first_name,
            middle_name: middle_name || null,
            last_name,
            email,
            password: hashedPassword,
            contact_number: contact_number || null,
            course: course || null,
            year_level: year_level || null,
            role: 'student',
            is_active: true,
        });

        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [user.id, 'REGISTER', JSON.stringify({ email: user.email })]
        ).catch(err => console.error('Activity log error:', err));

        // Return success response (without password)
        const { password: _, ...userWithoutPassword } = user;

        return sendSuccess(
            res,
            HTTP_STATUS.CREATED,
            SUCCESS_MESSAGES.CREATED,
            { user: userWithoutPassword }
        );
    } catch (error) {
        if (error.code && error.code.startsWith('23')) {
            return handleDatabaseError(res, error, 'REGISTER');
        }
        throw error;
    }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
exports.login = asyncHandler(async (req, res) => {
    const { identifier, password, role } = req.body;

    try {
        // Find user by email or student ID
        let user;
        if (role === 'admin') {
            user = await UserModel.findByEmail(identifier);
        } else {
            user = await UserModel.findByStudentId(identifier)
                || await UserModel.findByEmail(identifier);
        }

        // User not found
        if (!user) {
            return sendError(
                res,
                HTTP_STATUS.UNAUTHORIZED,
                ERROR_MESSAGES.INVALID_CREDENTIALS
            );
        }

        // Check if user is active
        if (!user.is_active) {
            return sendError(
                res,
                HTTP_STATUS.FORBIDDEN,
                ERROR_MESSAGES.USER_INACTIVE
            );
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return sendError(
                res,
                HTTP_STATUS.UNAUTHORIZED,
                ERROR_MESSAGES.INVALID_CREDENTIALS
            );
        }

        // Check role matches (if specified)
        if (role && user.role !== role) {
            return sendError(
                res,
                HTTP_STATUS.UNAUTHORIZED,
                `This account is registered as ${user.role}, not ${role}`
            );
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                student_id: user.student_id,
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [user.id, 'LOGIN', JSON.stringify({ ip: req.ip })]
        ).catch(err => console.error('Activity log error:', err));

        // Return success response
        const { password: _, ...userWithoutPassword } = user;

        return sendSuccess(
            res,
            HTTP_STATUS.OK,
            SUCCESS_MESSAGES.LOGIN_SUCCESS,
            {
                token,
                user: userWithoutPassword,
            }
        );
    } catch (error) {
        if (error.code && error.code.startsWith('23')) {
            return handleDatabaseError(res, error, 'LOGIN');
        }
        throw error;
    }
});

/**
 * POST /api/auth/logout
 * Logout user (token invalidation on client-side)
 */
exports.logout = asyncHandler(async (req, res) => {
    if (!req.user) {
        return sendError(res, HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.NO_TOKEN);
    }

    // Log activity
    await pool.query(
        `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
         VALUES ($1, $2, $3)`,
        [req.user.id, 'LOGOUT', JSON.stringify({})]
    ).catch(err => console.error('Activity log error:', err));

    return sendSuccess(res, HTTP_STATUS.OK, SUCCESS_MESSAGES.LOGOUT_SUCCESS);
});

/**
 * POST /api/auth/verify-token
 * Verify if token is still valid
 */
exports.verifyToken = asyncHandler(async (req, res) => {
    if (!req.user) {
        return sendError(res, HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.INVALID_TOKEN);
    }

    return sendSuccess(
        res,
        HTTP_STATUS.OK,
        'Token is valid',
        { user: req.user }
    );
});
