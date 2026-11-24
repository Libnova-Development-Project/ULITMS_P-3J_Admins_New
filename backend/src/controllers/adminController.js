const admin = require('../models/adminModel');
const asyncHandler = require('../utils/asyncHandler');

exports.listUsers = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await admin.users() });
});
exports.updateUser = asyncHandler(async (req, res) => {
  if (Number(req.params.id) === req.user.sub && req.body.status && req.body.status !== 'active') {
    return res.status(409).json({ success: false, error: { message: 'You cannot deactivate your own account' } });
  }
  const data = await admin.updateUser(req.user.sub, req.params.id, req.body);
  if (!data) return res.status(404).json({ success: false, error: { message: 'User not found' } });
  res.json({ success: true, data });
});
exports.removeUser = asyncHandler(async (req, res) => {
  if (Number(req.params.id) === req.user.sub) {
    return res.status(409).json({ success: false, error: { message: 'You cannot delete your own account' } });
  }
  const data = await admin.removeUser(req.user.sub, req.params.id);
  if (!data) return res.status(404).json({ success: false, error: { message: 'User not found' } });
  res.json({ success: true, data: { deleted: true, user_id: data.user_id } });
});
exports.notifications = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await admin.notifications(req.user.sub) });
});
exports.markRead = asyncHandler(async (req, res) => {
  const data = await admin.markRead(req.params.id, req.user.sub);
  if (!data) return res.status(404).json({ success: false, error: { message: 'Notification not found' } });
  res.json({ success: true, data });
});
exports.dashboard = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await admin.dashboard() });
});
exports.inventoryReport = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await admin.inventory() });
});
exports.audit = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await admin.audit(req.query) });
});
