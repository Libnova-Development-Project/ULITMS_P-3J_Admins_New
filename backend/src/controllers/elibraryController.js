const lib = require('../models/elibraryModel');
const asyncHandler = require('../utils/asyncHandler');

exports.units = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await lib.units(req.user.role) });
});
exports.start = asyncHandler(async (req, res) => {
  const sessionId = await lib.start(req.user.sub, req.body);
  res.status(201).json({ success: true, data: { session_id: sessionId } });
});
exports.end = asyncHandler(async (req, res) => {
  await lib.end(req.params.id, req.user.sub);
  res.json({ success: true, data: { session_id: Number(req.params.id), status: 'ended' } });
});
