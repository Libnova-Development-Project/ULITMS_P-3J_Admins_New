const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');

exports.register = async (req, res) => {
    try {
        const { 
            student_id, first_name, middle_name, last_name, email, 
            password, contact_number, course, year_level 
        } = req.body;

        // Validate required fields
        if (!student_id || !first_name || !last_name || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if user exists
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const existingStudent = await UserModel.findByStudentId(student_id);
        if (existingStudent) {
            return res.status(400).json({ message: 'Student ID already registered' });
        }

        // Create user
        const user = await UserModel.create({
            student_id, first_name, middle_name, last_name, email,
            password, contact_number, course, year_level, role: 'student'
        });

        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [user.id, 'REGISTER', { email: user.email }]
        );

        res.status(201).json({
            message: 'Registration successful',
            user
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }

        // Find user
        const user = await UserModel.findByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if active
        if (!user.is_active) {
            return res.status(401).json({ message: 'Account is deactivated' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check role
        if (role && user.role !== role) {
            return res.status(401).json({ message: `Access denied. ${role} role required` });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        // Log activity
        await pool.query(
            `INSERT INTO library_schema.activity_logs (user_id, action, log_data)
             VALUES ($1, $2, $3)`,
            [user.id, 'LOGIN', { timestamp: new Date().toISOString() }]
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                student_id: user.student_id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
};