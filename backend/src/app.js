const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const { pool } = require('./config/db');
const rate = require('./middleware/rateLimit');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));           // only the React frontend may call the API from a browser
app.use(express.json({ limit: '100kb' }));
app.use('/api', rate.general);

app.get('/api/health', async (req, res, next) => {
  try {
    const r = await pool.query('SELECT current_user AS db_user, current_schema() AS schema');
    res.json({ success: true, data: { status: 'ok', ...r.rows[0] } });
  } catch (error) {
    next(error);
  }
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: 'Route not found' } });
});
app.use(errorHandler);

module.exports = app;
