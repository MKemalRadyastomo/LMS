const { authenticate: enhancedAuthenticate, requireRole, requirePermission } = require('./rbac');
const { verifyToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/ApiError');
const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Legacy authentication middleware (maintained for backward compatibility)
 * Note: Use enhancedAuthenticate from rbac.js for new implementations
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
 * Legacy authorization middleware (maintained for backward compatibility)
 * Note: Use requireRole from rbac.js for new implementations
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

// Export both legacy and enhanced methods for flexibility
module.exports = {
  // Legacy methods (for backward compatibility)
  authenticate,
  authorize,
  
  // Enhanced methods (recommended for new code)
  enhancedAuthenticate,
  requireRole,
  requirePermission
};
