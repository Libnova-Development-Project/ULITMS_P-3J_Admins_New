const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const pool = require('../database/db');

exports.getAllUsers = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { limit = 100, offset = 0 } = req.query;
        const users = await UserModel.getAll(parseInt(limit), parseInt(offset));
        
        res.json({
            message: 'Users retrieved successfully',
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Failed to retrieve users', error: error.message });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const stats = await UserModel.getUserStats(id);
        
        res.json({
            message: 'User profile retrieved',
            user,
            stats
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ message: 'Failed to retrieve profile', error: error.message });
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const user = await UserModel.update(id, req.body);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'UPDATE_PROFILE', { user_id: id, updates: req.body }]
        );
        
        res.json({
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Failed to update profile', error: error.message });
    }
};

exports.uploadAvatar = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (req.user.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const pictureUrl = `/uploads/avatars/${req.file.filename}`;
        const result = await UserModel.updateProfilePicture(id, pictureUrl);
        
        if (!result) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'UPDATE_AVATAR', { picture_url: pictureUrl }]
        );
        
        res.json({
            message: 'Avatar uploaded successfully',
            profile_picture: pictureUrl
        });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ message: 'Failed to upload avatar', error: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        
        if (req.user.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }
        
        const user = await UserModel.findById(id);
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        
        await UserModel.changePassword(id, newPassword);
        
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'CHANGE_PASSWORD', { timestamp: new Date().toISOString() }]
        );
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Failed to change password', error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { id } = req.params;
        
        if (req.user.id === parseInt(id)) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        
        const result = await UserModel.delete(id);
        if (!result) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [req.user.id, 'DELETE_USER', { deleted_user_id: id }]
        );
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Failed to delete user', error: error.message });
    }
};