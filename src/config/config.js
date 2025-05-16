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
    max: process.env.RATE_LIMIT_MAX || 100, // Limit each IP to 100 requests per windowMs
  },
};
