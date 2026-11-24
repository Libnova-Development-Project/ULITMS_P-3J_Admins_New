const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/ulitms'
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Helper functions
const generateToken = (user) => {
    return jwt.sign(
        { 
            userId: user.id,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Database queries
const db = {
    // Books
    async getBooks(search = '', category = '', status = '') {
        let query = `
            SELECT b.*, bc.name as category_name 
            FROM library_schema.books b 
            LEFT JOIN library_schema.book_categories bc ON b.category_id = bc.id 
            WHERE b.is_deleted = FALSE
        `;
        const params = [];
        let paramIndex = 1;

        if (search) {
            query += ` AND (b.title ILIKE $${paramIndex} OR b.author ILIKE $${paramIndex} OR b.isbn ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            params.push(`%${search}%`);
            params.push(`%${search}%`);
            paramIndex += 3;
        }

        if (category) {
            query += ` AND b.category_id = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        if (status) {
            query += ` AND b.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ' ORDER BY b.title';
        
        const result = await pool.query(query, params);
        return result.rows;
    },

    async getBookById(id) {
        const result = await pool.query(
            'SELECT b.*, bc.name as category_name FROM library_schema.books b LEFT JOIN library_schema.book_categories bc ON b.category_id = bc.id WHERE b.id = $1 AND b.is_deleted = FALSE',
            [id]
        );
        return result.rows[0];
    },

    async createBook(bookData) {
        const result = await pool.query(
            `INSERT INTO library_schema.books 
             (isbn, title, author, publisher, publication_year, category_id, total_copies, available_copies, description, cover_image_url, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'available') 
             RETURNING *`,
            [bookData.isbn, bookData.title, bookData.author, bookData.publisher, bookData.publication_year, bookData.category_id, bookData.total_copies, bookData.total_copies, bookData.description, bookData.cover_image_url]
        );
        return result.rows[0];
    },

    async updateBook(id, bookData) {
        const result = await pool.query(
            `UPDATE library_schema.books 
             SET isbn = $1, title = $2, author = $3, publisher = $4, publication_year = $5, category_id = $6, total_copies = $7, available_copies = $8, description = $9, cover_image_url = $10, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $11 
             RETURNING *`,
            [bookData.isbn, bookData.title, bookData.author, bookData.publisher, bookData.publication_year, bookData.category_id, bookData.total_copies, bookData.available_copies, bookData.description, bookData.cover_image_url, id]
        );
        return result.rows[0];
    },

    async deleteBook(id) {
        await pool.query(
            'UPDATE library_schema.books SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );
        return { success: true };
    },

    // Users
    async getUsers(search = '', role = '', status = '') {
        let query = `
            SELECT u.*, 
                   CASE WHEN u.is_active = TRUE THEN 'Active'
                       ELSE 'Inactive'
                   END as status_text
            FROM library_schema.users u 
            WHERE u.is_deleted = FALSE
        `;
        const params = [];
        let paramIndex = 1;

        if (search) {
            query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.student_id ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            params.push(`%${search}%`);
            params.push(`%${search}%`);
            params.push(`%${search}%`);
            params.push(`%${search}%`);
            paramIndex += 4;
        }

        if (role) {
            query += ` AND u.role = $${paramIndex}`;
            params.push(role);
            paramIndex++;
        }

        if (status) {
            query += ` AND u.is_active = $${paramIndex}`;
            params.push(status === 'true');
            paramIndex++;
        }

        query += ' ORDER BY u.last_name, u.first_name';
        
        const result = await pool.query(query, params);
        return result.rows;
    },

    async getUserById(id) {
        const result = await pool.query(
            'SELECT u.*, CASE WHEN u.is_active = TRUE THEN \'Active\' ELSE \'Inactive\' END as status_text FROM library_schema.users u WHERE u.id = $1 AND u.is_deleted = FALSE',
            [id]
        );
        return result.rows[0];
    },

    async createUser(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const result = await pool.query(
            `INSERT INTO library_schema.users 
             (student_id, first_name, middle_name, last_name, email, password, role, contact_number, course, year_level, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
             RETURNING *`,
            [userData.student_id, userData.first_name, userData.middle_name, userData.last_name, userData.email, hashedPassword, userData.role, userData.contact_number, userData.course, userData.year_level, userData.is_active || true]
        );
        return result.rows[0];
    },

    async updateUser(id, userData) {
        const result = await pool.query(
            `UPDATE library_schema.users 
             SET first_name = $1, middle_name = $2, last_name = $3, email = $4, role = $5, contact_number = $6, course = $7, year_level = $8, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $9 
             RETURNING *`,
            [userData.first_name, userData.middle_name, userData.last_name, userData.email, userData.role, userData.contact_number, userData.course, userData.year_level, id]
        );
        return result.rows[0];
    },

    async toggleUserStatus(id, isActive) {
        await pool.query(
            'UPDATE library_schema.users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [isActive, id]
        );
        return { success: true };
    },

    async deleteUser(id) {
        await pool.query(
            'UPDATE library_schema.users SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );
        return { success: true };
    },

    // Activity Logs
    async logActivity(userId, action, data) {
        await pool.query(
            'INSERT INTO library_schema.activity_logs (user_id, action, raw_log, log_data, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
            [userId, action, JSON.stringify(data), JSON.stringify(data)]
        );
    },

    // Book Categories
    async getBookCategories() {
        const result = await pool.query(
            'SELECT * FROM library_schema.book_categories WHERE is_deleted = FALSE ORDER BY name'
        );
        return result.rows;
    }
};

// Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query(
            'SELECT u.*, CASE WHEN u.is_active = TRUE THEN \'Active\' ELSE \'Inactive\' END as status_text FROM library_schema.users u WHERE u.email = $1 AND u.is_deleted = FALSE',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user);
        
        // Log activity
        await db.logActivity(user.id, 'User Login', { email, role: user.role });
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Protected routes
app.get('/api/books', authenticateToken, async (req, res) => {
    try {
        const { search, category, status } = req.query;
        const books = await db.getBooks(search, category, status);
        res.json({ success: true, data: books });
    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/books/:id', authenticateToken, async (req, res) => {
    try {
        const book = await db.getBookById(req.params.id);
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }
        res.json({ success: true, data: book });
    } catch (error) {
        console.error('Get book error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/books', authenticateToken, async (req, res) => {
    try {
        const bookData = req.body;
        const newBook = await db.createBook(bookData);
        
        // Log activity
        await db.logActivity(req.user.userId, 'Book Created', { 
            isbn: bookData.isbn, 
            title: bookData.title 
        });
        
        res.status(201).json({ 
            success: true, 
            message: 'Book created successfully', 
            data: newBook 
        });
    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/books/:id', authenticateToken, async (req, res) => {
    try {
        const bookData = req.body;
        const updatedBook = await db.updateBook(req.params.id, bookData);
        
        // Log activity
        await db.logActivity(req.user.userId, 'Book Updated', { 
            isbn: bookData.isbn, 
            title: bookData.title 
        });
        
        res.json({ 
            success: true, 
            message: 'Book updated successfully', 
            data: updatedBook 
        });
    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/books/:id', authenticateToken, async (req, res) => {
    try {
        await db.deleteBook(req.params.id);
        
        // Log activity
        await db.logActivity(req.user.userId, 'Book Deleted', { bookId: req.params.id });
        
        res.json({ 
            success: true, 
            message: 'Book deleted successfully' 
        });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const { search, role, status } = req.query;
        const users = await db.getUsers(search, role, status);
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const user = await db.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        const userData = req.body;
        const newUser = await db.createUser(userData);
        
        // Log activity
        await db.logActivity(newUser.id, 'User Created', { 
            email: userData.email, 
            role: userData.role 
        });
        
        res.status(201).json({ 
            success: true, 
            message: 'User created successfully', 
            data: newUser 
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const userData = req.body;
        const updatedUser = await db.updateUser(req.params.id, userData);
        
        // Log activity
        await db.logActivity(req.user.userId, 'User Updated', { 
            email: userData.email 
        });
        
        res.json({ 
            success: true, 
            message: 'User updated successfully', 
            data: updatedUser 
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.patch('/api/users/:id/status', authenticateToken, async (req, res) => {
    try {
        const { is_active } = req.body;
        await db.toggleUserStatus(req.params.id, is_active);
        
        // Log activity
        await db.logActivity(req.user.userId, 'User Status Changed', { 
            newStatus: is_active ? 'Active' : 'Inactive' 
        });
        
        res.json({ 
            success: true, 
            message: 'User status updated successfully' 
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        await db.deleteUser(req.params.id);
        
        // Log activity
        await db.logActivity(req.user.userId, 'User Deleted', { userId: req.params.id });
        
        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/book-categories', authenticateToken, async (req, res) => {
    try {
        const categories = await db.getBookCategories();
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`ULITMS Backend server running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
});
