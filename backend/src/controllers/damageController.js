const damage = require('../models/damageModel');
const asyncHandler = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  const reportId = await damage.create(req.user.sub, req.body);
  res.status(201).json({ success: true, data: { report_id: reportId } });
});
exports.open = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await damage.open() });
});
exports.resolve = asyncHandler(async (req, res) => {
  await damage.resolve(req.params.id, req.user.sub, req.body);
  res.json({ success: true, data: { report_id: Number(req.params.id), status: req.body.status } });
});
