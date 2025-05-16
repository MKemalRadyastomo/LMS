const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { ApiError } = require('./ApiError');

/**
 * Generate a JWT token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiration,
  });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {ApiError} If token is invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    throw new ApiError(401, 'Invalid token');
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
