const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const auth = require('../models/authModel');
const asyncHandler = require('../utils/asyncHandler');

// Compared when the email does not exist, so response time does not reveal valid emails.
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.Vq0nYh4n6Qm3b3wQ5nQ2X1Zp6yFa';

exports.register = asyncHandler(async (req, res) => {
  const data = await auth.register(req.body);
  res.status(201).json({ success: true, data });
});

exports.login = asyncHandler(async (req, res) => {
  const user = await auth.login(req.body.email);
  const match = await bcrypt.compare(req.body.password, user ? user.out_password_hash : DUMMY_HASH);
  if (!user || user.out_status !== 'active' || !match) {
    return res.status(401).json({ success: false, error: { message: 'Invalid email or password' } });
  }
  const token = jwt.sign(
    { sub: user.out_user_id, role: user.out_role, name: user.out_full_name },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
  res.json({ success: true, data: { token, role: user.out_role, user_id: user.out_user_id } });
});

exports.me = asyncHandler(async (req, res) => {
  const profile = await auth.me(req.user.sub);
  if (!profile) return res.status(404).json({ success: false, error: { message: 'User not found' } });
  res.json({ success: true, data: profile });
});
