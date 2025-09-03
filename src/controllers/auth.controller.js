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
      email: req.body.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        const duration = Date.now() - startTime;
        logger.warn('Login failed: Missing credentials', {
          requestId,
          duration: `${duration}ms`,
          hasEmail: !!email,
          hasPassword: !!password
        });
        return next(badRequest('Email and password are required'));
      }

      logger.debug('Starting AuthService.login', {
        requestId,
        email,
        elapsed: `${Date.now() - startTime}ms`
      });

      const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
      const result = await AuthService.login(email, password, ipAddress);

      const duration = Date.now() - startTime;
      logger.info('Login successful', {
        requestId,
        email,
        userId: result.user_id,
        duration: `${duration}ms`
      });

      return res.status(200).json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Login controller error', {
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

  /**
   * Refresh token endpoint handler
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async refresh(req, res, next) {
    const startTime = Date.now();
    const requestId = req.id || Math.random().toString(36).substr(2, 9);

    logger.info('Token refresh attempt started', {
      requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    try {
      // Get token from authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const duration = Date.now() - startTime;
        logger.warn('Token refresh failed: Missing authorization header', {
          requestId,
          duration: `${duration}ms`
        });
        return next(badRequest('Authorization header with Bearer token is required'));
      }

      const token = authHeader.split(' ')[1];

      if (!token) {
        const duration = Date.now() - startTime;
        logger.warn('Token refresh failed: Missing token', {
          requestId,
          duration: `${duration}ms`
        });
        return next(badRequest('Token is required'));
      }

      logger.debug('Starting AuthService.refreshToken', {
        requestId,
        elapsed: `${Date.now() - startTime}ms`
      });

      const result = await AuthService.refreshToken(token);

      const duration = Date.now() - startTime;
      logger.info('Token refresh successful', {
        requestId,
        userId: result.user_id,
        duration: `${duration}ms`
      });

      return res.status(200).json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Token refresh controller error', {
        requestId,
        duration: `${duration}ms`,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      return next(error);
    }
  }
}

module.exports = AuthController;
