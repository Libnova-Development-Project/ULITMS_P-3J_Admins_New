const express = require('express');
const pool = require('../database/db');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description FROM library_schema.book_categories WHERE is_deleted = false ORDER BY name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create category (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Category name required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO library_schema.book_categories (name, description) VALUES ($1, $2) RETURNING *`,
      [name, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;