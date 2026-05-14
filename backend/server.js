const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const pool = require('./database/db');
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
const notificationRoutes = require('./routes/notifications');

const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:*", "https://localhost:*", "http://127.0.0.1:*", "http://*.local:*", "ws://localhost:*"]
        }
    }
}));

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:5000',
            'http://localhost:5001',
            'http://localhost:3000',
            'http://127.0.0.1:5500'
        ];

        // Add environment variable origin if exists
        if (process.env.CORS_ORIGIN) {
            allowedOrigins.push(...process.env.CORS_ORIGIN.split(',').map(o => o.trim()));
        }

        // Check if origin is allowed or if it's from the same host
        const isAllowed = allowedOrigins.some(ao => ao === origin) ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1');

        if (isAllowed) {
            callback(null, true);
        } else {
            // For development, be more lenient or log the rejected origin
            console.warn(`CORS: Origin ${origin} attempted to connect but not explicitly allowed.`);
            callback(null, true); // Still allow for now to prevent breaking UX, but log it
        }
    },
    credentials: true
}));

// API Rate Limiting
app.use('/api/', apiLimiter);

// Request Logging Middleware
app.use(logApiCall);

// IMPORTANT: Serve static files from frontend directory
// Adjust the path based on your folder structure
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Serve uploads folder as static
const uploadPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadPath));

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
app.use('/api/notifications', notificationRoutes);

// IMPORTANT: Serve index.html for all non-API routes (SPA support)
app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return next();
    }
    // Send index.html for all other routes
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
    return res.status(404).json({
        success: false,
        status: 404,
        message: 'API route not found',
        path: req.path,
        timestamp: new Date().toISOString(),
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Global Error Handler:', err);

    if (err.status === 429) {
        return res.status(429).json({
            success: false,
            status: 429,
            message: err.message || 'Too many requests',
            timestamp: new Date().toISOString(),
        });
    }

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
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
});