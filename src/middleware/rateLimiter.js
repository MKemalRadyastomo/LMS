const rateLimit = require('express-rate-limit');
const config = require('../config/config');

/**
 * Rate limiting middleware to prevent abuse of the API
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimitConfig.windowMs,
  max: config.rateLimitConfig.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: 429,
      message: 'Too many requests, please try again later.',
    });
  },
});

/**
 * More strict rate limiting for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 99999, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: 429,
      message: 'Too many login attempts, please try again later.',
    });
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
