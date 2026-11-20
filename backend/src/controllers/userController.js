const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

exports.getAllUsers = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }
        
        const { limit = 100, offset = 0 } = req.query;
        const users = await UserModel.getAll(parseInt(limit), parseInt(offset));
        
        res.json({
            success: true,
            message: 'Users retrieved successfully',
            data: {
                users,
                count: users.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve users', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ 
                success: false,
                message: 'Access denied',
                timestamp: new Date().toISOString()
            });
        }
        
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found',
                timestamp: new Date().toISOString()
            });
        }
        
        const stats = await UserModel.getUserStats(id);
        
        res.json({
            success: true,
            message: 'User profile retrieved successfully',
            data: { user, stats },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve profile', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ 
                success: false,
                message: 'Access denied',
                timestamp: new Date().toISOString()
            });
        }
        
        const user = await UserModel.update(id, req.body);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found',
                timestamp: new Date().toISOString()
            });
        }
        
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'UPDATE_PROFILE', JSON.stringify({ user_id: id, updates: req.body })]
        );
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update profile', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }
        
        const { id } = req.params;
        const success = await UserModel.delete(id);
        
        if (!success) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found',
                timestamp: new Date().toISOString()
            });
        }
        
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'DELETE_USER', JSON.stringify({ user_id: id })]
        );
        
        res.json({
            success: true,
            message: 'User deleted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete user', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }
        
        const { id } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'is_active must be a boolean',
                timestamp: new Date().toISOString()
            });
        }
        
        const result = await pool.query(
            `UPDATE library_schema.users 
             SET is_active = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND is_deleted = false
             RETURNING id, is_active`,
            [is_active, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found',
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            message: `User status updated to ${is_active ? 'active' : 'inactive'}`,
            data: { user: result.rows[0] },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update user status', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.createUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }

        const {
            first_name, last_name, email, password,
            student_id, course, year_level, contact, role
        } = req.body;

        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Required fields missing',
                timestamp: new Date().toISOString()
            });
        }

        // Check if user already exists
        const existingEmail = await UserModel.findByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ 
                success: false,
                message: 'Email already registered',
                timestamp: new Date().toISOString()
            });
        }

        if (student_id) {
            const existingStudent = await UserModel.findByStudentId(student_id);
            if (existingStudent) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Student ID already registered',
                    timestamp: new Date().toISOString()
                });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            `INSERT INTO library_schema.users 
             (first_name, last_name, email, password, student_id, course, year_level, contact_number, role, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id, first_name, last_name, email, role`,
            [first_name, last_name, email, hashedPassword, student_id, course, year_level, contact, role || 'student', true]
        );

        const newUser = result.rows[0];

        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'CREATE_USER', JSON.stringify({ user_id: newUser.id, email: newUser.email })]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { user: newUser },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create user', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long',
                timestamp: new Date().toISOString()
            });
        }
        
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ 
                success: false,
                message: 'Access denied',
                timestamp: new Date().toISOString()
            });
        }
        
        // If not admin, check current password
        if (req.user.role !== 'admin') {
            const user = await pool.query('SELECT password FROM library_schema.users WHERE id = $1', [id]);
            if (!user.rows[0]) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.rows[0].password);
            if (!isMatch) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Incorrect current password',
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        await UserModel.changePassword(id, newPassword);
        
        res.json({
            success: true,
            message: 'Password changed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to change password', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.uploadAvatar = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.id !== parseInt(id)) {
            return res.status(403).json({ 
                success: false,
                message: 'Unauthorized',
                timestamp: new Date().toISOString()
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: 'No file uploaded',
                timestamp: new Date().toISOString()
            });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        await UserModel.updateProfilePicture(id, avatarUrl);

        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            data: { profile_picture: avatarUrl },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to upload avatar', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
