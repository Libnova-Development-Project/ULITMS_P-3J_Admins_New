module.exports = function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: result.error.flatten() },
      });
    }
    // defineProperty works for body, params and query on every Express version
    Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true });
    next();
  };
};
