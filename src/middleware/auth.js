module.exports.authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  // In production, allow any non-empty API key
  if (process.env.NODE_ENV === 'production') {
    if (!apiKey || apiKey.trim() === '') {
      return res.status(401).json({
        status: 'error',
        message: 'API key required'
      });
    }
    return next();
  }

  // In development, validate against allowed keys
  const allowedKeys = process.env.API_KEYS
    ? process.env.API_KEYS.split(',').map(k => k.trim())
    : [];

  if (!apiKey || !allowedKeys.includes(apiKey)) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid API key'
    });
  }

  next();
};
