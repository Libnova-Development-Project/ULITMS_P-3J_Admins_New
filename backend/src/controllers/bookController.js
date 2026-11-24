const book = require('../models/bookModel');
const asyncHandler = require('../utils/asyncHandler');

exports.search = asyncHandler(async (req, res) => {
  const data = await book.search(req.query.keyword, req.query.category_id);
  res.json({ success: true, data });
});

exports.getOne = asyncHandler(async (req, res) => {
  const data = await book.getOne(req.params.id);
  if (!data) return res.status(404).json({ success: false, error: { message: 'Book not found' } });
  res.json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await book.create(req.user.sub, req.body);
  res.status(201).json({ success: true, data });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await book.update(req.user.sub, req.params.id, req.body);
  if (!data) return res.status(404).json({ success: false, error: { message: 'Book not found' } });
  res.json({ success: true, data });
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await book.remove(req.user.sub, req.params.id);
  if (!data) return res.status(404).json({ success: false, error: { message: 'Book not found' } });
  res.json({ success: true, data: { deleted: true, book_id: data.book_id } });
});
