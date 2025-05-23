const AuthService = require('../services/auth.service');
const { badRequest } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Authentication Controller with Performance Monitoring
 */
class AuthController {
  /**
   * Login endpoint handler
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async login(req, res, next) {
    const startTime = Date.now();
    const requestId = req.id || Math.random().toString(36).substr(2, 9);
    
    logger.info('Login attempt started', {
      requestId,
      username: req.body.username,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        const duration = Date.now() - startTime;
        logger.warn('Login failed: Missing credentials', {
          requestId,
          duration: `${duration}ms`,
          hasUsername: !!username,
          hasPassword: !!password
        });
        return next(badRequest('Username and password are required'));
      }

      logger.debug('Starting AuthService.login', {
        requestId,
        username,
        elapsed: `${Date.now() - startTime}ms`
      });
      
      const result = await AuthService.login(username, password);
      
      const duration = Date.now() - startTime;
      logger.info('Login successful', {
        requestId,
        username,
        userId: result.user_id,
        duration: `${duration}ms`
      });
      
      return res.status(200).json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Login controller error', {
        requestId,
        username: req.body.username,
        duration: `${duration}ms`,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      return next(error);
    }
  }

  /**
   * Registration endpoint handler
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async register(req, res, next) {
    const startTime = Date.now();
    const requestId = req.id || Math.random().toString(36).substr(2, 9);
    
    logger.info('Registration attempt started', {
      requestId,
      email: req.body.email,
      role: req.body.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    try {
      const { email, password, full_name, role } = req.body;

      const userData = {
        email,
        password,
        name: full_name || req.body.name,
        role
      };

      if (!userData.email || !userData.password || !userData.name || !userData.role) {
        const duration = Date.now() - startTime;
        logger.warn('Registration failed: Missing required fields', {
          requestId,
          duration: `${duration}ms`,
          hasEmail: !!userData.email,
          hasPassword: !!userData.password,
          hasName: !!userData.name,
          hasRole: !!userData.role
        });
        return next(badRequest('Email, password, name, and role are required'));
      }

      logger.debug('Starting AuthService.register', {
        requestId,
        email: userData.email,
        role: userData.role,
        elapsed: `${Date.now() - startTime}ms`
      });
      
      const result = await AuthService.register(userData);
      
      const duration = Date.now() - startTime;
      logger.info('Registration successful', {
        requestId,
        email: userData.email,
        userId: result.id,
        role: result.role,
        duration: `${duration}ms`
      });

      return res.status(201).json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Registration controller error', {
        requestId,
        email: req.body.email,
        duration: `${duration}ms`,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      return next(error);
    }
  }

  /**
   * Get current user information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async me(req, res, next) {
    try {
      const userData = await AuthService.checkAuth(req.user);

      return res.status(200).json(userData);
    } catch (error) {
      logger.error(`Get current user error: ${error.message}`);
      return next(error);
    }
  }

  /**
   * Logout endpoint handler
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async logout(req, res, next) {
    try {
      // Server-side logout actions can be added here if needed,
      // e.g., invalidating a server-side session or blacklisting a token.
      // For JWT-based authentication without server-side session,
      // the primary logout action is client-side token removal.

      return res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      logger.error(`Logout controller error: ${error.message}`);
      return next(error);
    }
  }
}

module.exports = AuthController;
