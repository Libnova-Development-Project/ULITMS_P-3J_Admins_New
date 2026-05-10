const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../database/db');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, student_id, name, email, role, contact_number, course, year_level, is_active, created_at
       FROM library_schema.users WHERE id = $1 AND is_active = true`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me', auth, async (req, res) => {
  const { contact_number, course, year_level } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE library_schema.users 
       SET contact_number = COALESCE($1, contact_number), course = COALESCE($2, course),
           year_level = COALESCE($3, year_level), updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, student_id, name, email, role, contact_number, course, year_level`,
      [contact_number, course, year_level, req.user.id]
    );
    
    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/change-password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new password required' });
  }
  
  try {
    const userResult = await pool.query(`SELECT password FROM library_schema.users WHERE id = $1`, [req.user.id]);
    const validPassword = await bcrypt.compare(current_password, userResult.rows[0].password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query(`UPDATE library_schema.users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [hashedPassword, req.user.id]);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const borrowStats = await pool.query(
      `SELECT COUNT(*) as books_borrowed,
              COUNT(CASE WHEN status = 'borrowed' THEN 1 END) as currently_borrowed,
              COUNT(CASE WHEN status = 'returned' THEN 1 END) as total_returned,
              SUM(fine_amount) as unpaid_fines
       FROM library_schema.borrow_transactions WHERE user_id = $1`,
      [req.user.id]
    );
    
    const elibStats = await pool.query(
      `SELECT COUNT(*) as total_sessions, COALESCE(SUM(duration_mins), 0) as total_hours
       FROM library_schema.elibrary_sessions WHERE user_id = $1 AND status = 'completed'`,
      [req.user.id]
    );
    
    res.json({
      books_borrowed: parseInt(borrowStats.rows[0].books_borrowed || 0),
      currently_borrowed: parseInt(borrowStats.rows[0].currently_borrowed || 0),
      total_returned: parseInt(borrowStats.rows[0].total_returned || 0),
      unpaid_fines: parseFloat(borrowStats.rows[0].unpaid_fines || 0),
      total_sessions: parseInt(elibStats.rows[0].total_sessions || 0),
      total_hours: (elibStats.rows[0].total_hours / 60).toFixed(1)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
