const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const pool = require('./database/db');
const seedDatabase = require('./seed/initialData');
const { apiLimiter } = require('./middleware/rateLimiter');
const { logApiCall } = require('./utils/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const borrowingRoutes = require('./routes/borrowings');
const userRoutes = require('./routes/users');
const elibraryRoutes = require('./routes/elibrary');
const peripheralRoutes = require('./routes/peripherals');
const damageReportRoutes = require('./routes/damageReports');

const app = express();

// Security Middleware
app.use(helmet()); // Secure HTTP headers

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

// API Rate Limiting (applies to all /api routes)
app.use('/api/', apiLimiter);

// Request Logging Middleware
app.use(logApiCall);

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() as time, current_schema() as schema');
        res.status(200).json({
            status: 'healthy',
            database: 'connected',
            schema: 'library_schema',
            timestamp: result.rows[0].time,
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message
        });
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/borrowings', borrowingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/elibrary', elibraryRoutes);
app.use('/api/peripherals', peripheralRoutes);
app.use('/api/damage-reports', damageReportRoutes);

// 404 Handler
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        status: 404,
        message: 'Route not found',
        path: req.path,
        timestamp: new Date().toISOString(),
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Global Error Handler:', err);

    // Handle rate limit errors
    if (err.status === 429) {
        return res.status(429).json({
            success: false,
            status: 429,
            message: err.message || 'Too many requests',
            timestamp: new Date().toISOString(),
        });
    }

    // Handle validation errors
    if (err.validationErrors) {
        return res.status(422).json({
            success: false,
            status: 422,
            message: 'Validation failed',
            errors: err.validationErrors,
            timestamp: new Date().toISOString(),
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        status: err.status || 500,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        timestamp: new Date().toISOString(),
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 ULITMS Server running on http://localhost:${PORT}`);
    console.log(`📝 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Seed database on startup (optional - comment out after first run)
    // seedDatabase().catch(err => console.error('Seeding failed:', err));
});