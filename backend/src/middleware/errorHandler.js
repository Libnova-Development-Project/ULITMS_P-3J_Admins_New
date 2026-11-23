function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || (err.code === '23505' || err.code === 'P0001' ? 409 : ['23502','23503','23514','22P02','22001','22003'].includes(err.code) ? 400 : 500);
  const message = status === 500 ? 'Internal server error.' : err.message;
  if (process.env.NODE_ENV !== 'test') console.error('[api]', err.message);
  res.status(status).json({
    success: false,
    message,
    ...(status === 409 && { detail: 'A record with the same unique value already exists.' }),
    ...(process.env.NODE_ENV === 'development' && { debug: err.message })
  });
}
module.exports = { notFound, errorHandler };
