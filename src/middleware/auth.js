/**
 * API Key Authentication Middleware
 * Supports multiple keys from .env (comma separated)
 * Header: x-api-key
 */

require('dotenv').config();

const authenticateApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        status: 'error',
        message: 'API key missing (x-api-key header required)'
      });
    }

    // Read keys from .env
    const validKeys = (process.env.API_KEYS || '')
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    if (validKeys.length === 0) {
      console.error('❌ No API_KEYS configured in .env');
      return res.status(500).json({
        status: 'error',
        message: 'Server configuration error'
      });
    }

    if (!validKeys.includes(apiKey)) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid API key'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

module.exports = { authenticateApiKey };
