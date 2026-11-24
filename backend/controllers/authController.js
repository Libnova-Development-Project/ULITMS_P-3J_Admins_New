const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');

exports.register = async (req, res) => {
    try {
        console.log('📝 Registration request received:', req.body);
        
        const { 
            student_id, first_name, middle_name, last_name, email, 
            password, contact_number, course, year_level 
        } = req.body;

        // Check all required fields
        if (!student_id || student_id.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Student ID is required',
                timestamp: new Date().toISOString()
            });
        }
        
        if (!first_name || first_name.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'First name is required',
                timestamp: new Date().toISOString()
            });
        }
        
        if (!last_name || last_name.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Last name is required',
                timestamp: new Date().toISOString()
            });
        }
        
        if (!email || email.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Email is required',
                timestamp: new Date().toISOString()
            });
        }
        
        if (!password || password.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Password is required',
                timestamp: new Date().toISOString()
            });
        }

        // Check if user exists
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: 'Email already registered',
                timestamp: new Date().toISOString()
            });
        }

        const existingStudent = await UserModel.findByStudentId(student_id);
        if (existingStudent) {
            return res.status(400).json({ 
                success: false,
                message: 'Student ID already registered',
                timestamp: new Date().toISOString()
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await pool.query(
            `INSERT INTO library_schema.users 
             (student_id, first_name, middle_name, last_name, email, password, 
              contact_number, course, year_level, role, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id, student_id, first_name, last_name, email, role, course, year_level, contact_number`,
            [
                student_id, 
                first_name, 
                middle_name || null, 
                last_name, 
                email, 
                hashedPassword,
                contact_number || null, 
                course || null, 
                year_level || null, 
                'student',
                true
            ]
        );
        
        const user = result.rows[0];
        
        console.log('✅ User created:', user);

        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [user.id, 'REGISTER', JSON.stringify({ email: user.email })]
        ).catch(err => console.error('Activity log error:', err));

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: { user },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Registration failed: ' + error.message,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { identifier, password, role } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Student ID/Email and password required',
                timestamp: new Date().toISOString()
            });
        }

        // Find user by email or student ID
        let user = await UserModel.findByEmail(identifier);
        if (!user) {
            user = await UserModel.findByStudentId(identifier);
        }
        
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials',
                timestamp: new Date().toISOString()
            });
        }

        // Check if active
        if (!user.is_active) {
            return res.status(401).json({ 
                success: false,
                message: 'Account is deactivated',
                timestamp: new Date().toISOString()
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials',
                timestamp: new Date().toISOString()
            });
        }

        // Check role
        if (role && user.role !== role) {
            return res.status(401).json({ 
                success: false,
                message: `Access denied. ${role} role required`,
                timestamp: new Date().toISOString()
            });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, student_id: user.student_id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [user.id, 'LOGIN', JSON.stringify({ timestamp: new Date().toISOString() })]
        );

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                student_id: user.student_id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                course: user.course,
                year_level: user.year_level,
                contact_number: user.contact_number,
                profile_picture: user.profile_picture
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Login failed', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.logout = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Logged out successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Logout failed',
            error: error.message
        });
    }
};

exports.requestPasswordReset = async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ success: false, message: 'ID or Email required' });

        let user = await UserModel.findByEmail(identifier);
        if (!user) user = await UserModel.findByStudentId(identifier);

        if (!user) {
            // Security best practice: don't reveal if user exists, but for demo we will
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Generate 6-digit PIN
        const resetPin = Math.floor(100000 + Math.random() * 900000).toString();
        await UserModel.setResetToken(user.id, resetPin);

        // In a real app, send email here. For demo, we return it.
        res.json({
            success: true,
            message: 'A reset PIN has been generated for your account.',
            debug_pin: resetPin, // REMOVE IN PRODUCTION
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Token and new password required' });

        const user = await UserModel.findByResetToken(token);
        if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset PIN' });

        await UserModel.changePassword(user.id, newPassword);

        res.json({
            success: true,
            message: 'Password has been reset successfully.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};