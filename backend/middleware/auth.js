const jwt = require('jsonwebtoken');
const pool = require('../database/db');

const auth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user still exists and is active
        const user = await pool.query(
            `SELECT id, student_id, email, role, is_active 
             FROM library_schema.users 
             WHERE id = $1 AND is_deleted = false`,
            [decoded.id]
        );
        
        if (user.rows.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }
        
        if (!user.rows[0].is_active) {
            return res.status(401).json({ message: 'Account is deactivated' });
        }
        
        req.user = {
            id: user.rows[0].id,
            student_id: user.rows[0].student_id,
            email: user.rows[0].email,
            role: user.rows[0].role
        };
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        res.status(401).json({ message: 'Authentication failed' });
    }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

module.exports = { auth, adminOnly };