const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  jwtExpiration: process.env.JWT_EXPIRATION || '1d',
  rateLimitConfig: {
    windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000 || 15 * 60 * 1000, // 15 minutes by default
    max: process.env.RATE_LIMIT_MAX || (process.env.NODE_ENV === 'development' ? 10000 : 100), // Much higher limit for development debugging
  },
  authRateLimitConfig: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.AUTH_RATE_LIMIT_MAX || (process.env.NODE_ENV === 'development' ? 5000 : 50), // Much higher limit for development debugging
  },
};
