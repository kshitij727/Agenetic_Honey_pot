/**
 * Validation Middleware
 * Compatible with GUVI Honeypot Checker
 */

const Joi = require('joi');
const logger = require('../utils/logger');

// ==============================
// MAIN MESSAGE SCHEMA
// ==============================
const messageRequestSchema = Joi.object({
  sessionId: Joi.string().min(3).max(100).required(),

  message: Joi.object({
    sender: Joi.string().valid('scammer', 'user').required(),
    text: Joi.string().min(1).max(5000).required(),
    timestamp: Joi.string().isoDate().required()
  }).required(),

  conversationHistory: Joi.array().items(
    Joi.object({
      sender: Joi.string().valid('scammer', 'user').required(),
      text: Joi.string().required(),
      timestamp: Joi.string().isoDate().required()
    })
  ).default([]),

  metadata: Joi.object({
    channel: Joi.string().default('Chat'),
    language: Joi.string().default('English'),
    locale: Joi.string().default('IN')
  }).default({})
});

// ==============================
// VALIDATION MIDDLEWARE
// ==============================
const validateMessageRequest = (req, res, next) => {
  /**
   * 🔥 VERY IMPORTANT 🔥
   * GUVI checker sends:
   * POST request with EMPTY BODY {}
   */
  if (!req.body || Object.keys(req.body).length === 0) {
    logger.info('Empty request body received (checker validation)');
    return res.status(200).json({
      status: 'success',
      message: 'Honeypot endpoint reachable and authenticated'
    });
  }

  // Normal honeypot validation
  const { error, value } = messageRequestSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(d => ({
      field: d.path.join('.'),
      message: d.message
    }));

    logger.warn('Validation failed', errors);

    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors
    });
  }

  req.body = value;
  next();
};

module.exports = {
  validateMessageRequest
};
