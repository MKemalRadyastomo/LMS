const { verifyToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/ApiError');
const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate requests using JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    // Check if auth header exists and has the correct format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(unauthorized('Authentication required'));
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(unauthorized('Authentication token is missing'));
    }
    
    // Verify the token
    const decoded = verifyToken(token);
    
    // Attach the user to the request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return next(unauthorized('Invalid or expired token'));
  }
};

/**
 * Middleware to authorize based on user roles
 * @param {string[]} roles - Allowed roles
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(unauthorized('User not authenticated'));
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return next(forbidden('You do not have permission to access this resource'));
    }
    
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
