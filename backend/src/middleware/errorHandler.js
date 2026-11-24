const env = require('../config/env');
const { pgError } = require('../utils/pgErrors');

module.exports = function errorHandler(error, req, res, next) {
  let status = error.status || error.statusCode;
  let message = error.message;

  if (error.code) {
    const mapped = pgError(error);
    status = mapped.status;
    message = mapped.message;
  }
  status = status || 500;
  if (status === 500) {
    console.error(error);
    message = 'Unexpected server error';
  }
  if (env.nodeEnv !== 'production' && error.code) {
    console.error(error);
  }
  res.status(status).json({ success: false, error: { message } });
};
