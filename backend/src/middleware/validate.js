function idParam(req, res, next) {
  if (!/^[1-9]\d*$/.test(req.params.id || '')) {
    return res.status(400).json({ success: false, message: 'ID must be a positive integer.' });
  }
  next();
}
function pagination(req, res, next) {
  const limit = Number.parseInt(req.query.limit ?? '50', 10);
  const offset = Number.parseInt(req.query.offset ?? '0', 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200 ||
      !Number.isInteger(offset) || offset < 0) {
    return res.status(400).json({ success: false, message: 'Invalid pagination values.' });
  }
  req.pagination = { limit, offset };
  next();
}
module.exports = { idParam, pagination };
