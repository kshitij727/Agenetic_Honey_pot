const logger = require('../utils/logger');

const validateMessageRequest = (req, res, next) => {
  try {
    // Allow minimal checker payload
    const body = req.body || {};

    if (!body.sessionId) {
      body.sessionId = `checker-${Date.now()}`;
    }

    // If message is plain string, normalize it
    if (typeof body.message === 'string') {
      body.message = {
        sender: 'scammer',
        text: body.message,
        timestamp: new Date().toISOString()
      };
    }

    // If message object exists but missing fields
    if (typeof body.message === 'object') {
      body.message.sender = body.message.sender || 'scammer';
      body.message.text = body.message.text || 'test message';
      body.message.timestamp =
        body.message.timestamp || new Date().toISOString();
    }

    body.conversationHistory = body.conversationHistory || [];
    body.metadata = body.metadata || { channel: 'Chat' };

    req.body = body;
    next();
  } catch (error) {
    logger.error('Validation error', error);
    return res.status(400).json({
      status: 'error',
      message: 'INVALID_REQUEST_BODY'
    });
  }
};

module.exports = { validateMessageRequest };
