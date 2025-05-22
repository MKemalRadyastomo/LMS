const AuthService = require('../services/auth.service');
const { badRequest } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Authentication Controller
 */
class AuthController {
  /**
   * Login endpoint handler
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async login(req, res, next) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return next(badRequest('Username and password are required'));
      }

      const result = await AuthService.login(username, password);

      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Login controller error: ${error.message}`);
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
    try {
      const { email, password, full_name, role } = req.body;

      const userData = {
        email,
        password,
        name: full_name || req.body.name,
        role
      };

      if (!userData.email || !userData.password || !userData.name || !userData.role) {
        return next(badRequest('Email, password, name, and role are required'));
      }

      const result = await AuthService.register(userData);

      return res.status(201).json(result);
    } catch (error) {
      logger.error(`Registration controller error: ${error.message}`);
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
