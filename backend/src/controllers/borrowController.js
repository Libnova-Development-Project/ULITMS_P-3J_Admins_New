const borrow = require('../models/borrowModel');
const asyncHandler = require('../utils/asyncHandler');

exports.submit = asyncHandler(async (req, res) => {
  const data = await borrow.submit(req.user.sub, req.body.book_id);
  res.status(201).json({ success: true, data });
});
exports.mine = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await borrow.mine(req.user.sub) });
});
exports.pending = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await borrow.pending() });
});
exports.active = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await borrow.active() });
});
exports.decide = asyncHandler(async (req, res) => {
  await borrow.decide(req.params.id, req.user.sub, req.body.decision, req.body.note, req.body.loan_days);
  res.json({ success: true, data: { borrow_id: Number(req.params.id), decision: req.body.decision } });
});
exports.issue = asyncHandler(async (req, res) => {
  await borrow.issue(req.params.id, req.user.sub);
  res.json({ success: true, data: { borrow_id: Number(req.params.id), status: 'borrowed' } });
});
exports.requestReturn = asyncHandler(async (req, res) => {
  await borrow.requestReturn(req.params.id, req.user.sub);
  res.json({ success: true, data: { borrow_id: Number(req.params.id), status: 'pending_return' } });
});
exports.confirmReturn = asyncHandler(async (req, res) => {
  const fine = await borrow.confirmReturn(req.params.id, req.user.sub);
  res.json({ success: true, data: { borrow_id: Number(req.params.id), status: 'returned', fine_amount: fine } });
});
exports.markOverdue = asyncHandler(async (req, res) => {
  const updated = await borrow.markOverdue();
  res.json({ success: true, data: { updated: updated ?? 0 } });
});
