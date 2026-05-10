const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./database/db');
const seedDatabase = require('./seed/initialData');

// Import routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const borrowingRoutes = require('./routes/borrowings');
const userRoutes = require('./routes/users');
const elibraryRoutes = require('./routes/elibrary');
const peripheralRoutes = require('./routes/peripherals');
const damageReportRoutes = require('./routes/damageReports');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

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
    res.status(404).json({ 
        message: 'Route not found',
        path: req.path 
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    
    // Log to database (optional)
    pool.query(
        `INSERT INTO library_schema.activity_logs (action, raw_log, log_data) 
         VALUES ($1, $2, $3)`,
        ['ERROR', { path: req.path, method: req.method }, { error: err.message }]
    ).catch(console.error);
    
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
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