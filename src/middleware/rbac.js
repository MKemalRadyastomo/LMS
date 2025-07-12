const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { ApiError } = require('../utils/ApiError');
const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Role-based permissions mapping
 */
const rolePermissions = {
  admin: ['*'], // All permissions
  guru: [
    'course:create', 'course:read', 'course:update', 'course:delete',
    'assignment:create', 'assignment:read', 'assignment:update', 'assignment:delete',
    'material:create', 'material:read', 'material:update', 'material:delete',
    'grade:create', 'grade:read', 'grade:update',
    'analytics:read',
    'enrollment:manage'
  ],
  siswa: [
    'course:read', 'assignment:read', 'assignment:submit',
    'material:read', 'grade:read', 'profile:update',
    'enrollment:self'
  ]
};

/**
 * Enhanced authentication middleware with session timeout and account lockout
 */
const authenticate = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    // Check if auth header exists and has the correct format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new ApiError(401, 'Authentication token is missing');
    }
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check session timeout (30 minutes)
    const sessionAge = Date.now() - decoded.iat * 1000;
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT) || 1800000; // 30 minutes default
    
    if (sessionAge > sessionTimeout) {
      // Deactivate the session in database
      await deactivateSession(token);
      throw new ApiError(401, 'Session expired');
    }
    
    // Get user details from database
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw new ApiError(401, 'Invalid token - user not found');
    }
    
    // Update session activity
    await updateSessionActivity(token, decoded.id);
    
    // Attach the user to the request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };
    
    // Log user activity
    await logUserActivity(user.id, 'api_access', null, null, {
      endpoint: req.path,
      method: req.method
    }, req);
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.error(`JWT verification failed: ${error.message}`);
      return next(new ApiError(401, 'Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      logger.error(`JWT token expired: ${error.message}`);
      return next(new ApiError(401, 'Token expired'));
    } else if (error instanceof ApiError) {
      return next(error);
    } else {
      logger.error(`Authentication error: ${error.message}`);
      return next(new ApiError(401, 'Authentication failed'));
    }
  }
};

/**
 * Role-based authorization middleware
 * @param {string[]} roles - Allowed roles
 */
const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'User not authenticated'));
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role} to endpoint requiring roles: ${roles.join(', ')}`);
      return next(new ApiError(403, 'Insufficient permissions - role not authorized'));
    }
    
    next();
  };
};

/**
 * Permission-based authorization middleware
 * @param {string} permission - Required permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'User not authenticated'));
    }
    
    const userRole = req.user.role;
    const permissions = rolePermissions[userRole] || [];
    
    if (!permissions.includes('*') && !permissions.includes(permission)) {
      logger.warn(`Permission denied for user ${req.user.id} with role ${userRole}. Required permission: ${permission}`);
      return next(new ApiError(403, `Insufficient permissions - ${permission} required`));
    }
    
    next();
  };
};

/**
 * Update session activity in database
 */
const updateSessionActivity = async (token, userId) => {
  try {
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    
    // First try to update existing session
    const updateResult = await db.query(`
      UPDATE user_sessions 
      SET last_activity = NOW(),
          expires_at = NOW() + INTERVAL '30 minutes',
          is_active = true
      WHERE token_hash = $1 AND user_id = $2
    `, [tokenHash, userId]);
    
    // If no rows were updated, insert new session
    if (updateResult.rowCount === 0) {
      await db.query(`
        INSERT INTO user_sessions (user_id, token_hash, last_activity, expires_at, is_active)
        VALUES ($1, $2, NOW(), NOW() + INTERVAL '30 minutes', true)
      `, [userId, tokenHash]);
    }
  } catch (error) {
    logger.error(`Failed to update session activity: ${error.message}`);
  }
};

/**
 * Deactivate session in database
 */
const deactivateSession = async (token) => {
  try {
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    
    await db.query(`
      UPDATE user_sessions 
      SET is_active = false 
      WHERE token_hash = $1
    `, [tokenHash]);
  } catch (error) {
    logger.error(`Failed to deactivate session: ${error.message}`);
  }
};

/**
 * Log user activity
 */
const logUserActivity = async (userId, activityType, resourceType = null, resourceId = null, details = {}, req = null) => {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress) : null;
    const userAgent = req ? req.headers['user-agent'] : null;
    
    await db.query(`
      INSERT INTO activity_logs (user_id, activity_type, resource_type, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [userId, activityType, resourceType, resourceId, JSON.stringify(details), ipAddress, userAgent]);
  } catch (error) {
    logger.error(`Failed to log user activity: ${error.message}`);
  }
};

/**
 * Check if user account is locked
 */
const checkAccountLockout = async (email, ipAddress = null) => {
  try {
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION) || 1800000; // 30 minutes
    
    // Check failed attempts in the last lockout period
    const result = await db.query(`
      SELECT COUNT(*) as attempt_count
      FROM failed_login_attempts 
      WHERE email = $1 
        AND attempt_time > NOW() - INTERVAL '${lockoutDuration} milliseconds'
    `, [email]);
    
    const attemptCount = parseInt(result.rows[0].attempt_count);
    
    if (attemptCount >= maxAttempts) {
      // Account is locked
      const lockoutEnd = new Date(Date.now() + lockoutDuration);
      throw new ApiError(423, `Account locked due to too many failed login attempts. Try again after ${lockoutEnd.toISOString()}`);
    }
    
    return { attemptCount, maxAttempts, isLocked: false };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error(`Failed to check account lockout: ${error.message}`);
    return { attemptCount: 0, maxAttempts: 5, isLocked: false };
  }
};

/**
 * Record failed login attempt
 */
const recordFailedLoginAttempt = async (email, ipAddress = null) => {
  try {
    await db.query(`
      INSERT INTO failed_login_attempts (email, ip_address)
      VALUES ($1, $2)
    `, [email, ipAddress]);
  } catch (error) {
    logger.error(`Failed to record failed login attempt: ${error.message}`);
  }
};

/**
 * Clear failed login attempts for user
 */
const clearFailedLoginAttempts = async (email) => {
  try {
    await db.query(`
      DELETE FROM failed_login_attempts 
      WHERE email = $1
    `, [email]);
  } catch (error) {
    logger.error(`Failed to clear failed login attempts: ${error.message}`);
  }
};

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  updateSessionActivity,
  deactivateSession,
  logUserActivity,
  checkAccountLockout,
  recordFailedLoginAttempt,
  clearFailedLoginAttempts,
  rolePermissions
};