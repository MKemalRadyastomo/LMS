const User = require('../models/user.model');
const { comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { unauthorized, badRequest, conflict } = require('../utils/ApiError');
const logger = require('../utils/logger');
const { 
  checkAccountLockout, 
  recordFailedLoginAttempt, 
  clearFailedLoginAttempts 
} = require('../middleware/rbac');

/**
 * Authentication Service
 */
class AuthService {
  /**
   * Login a user with enhanced security (account lockout)
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} ipAddress - Client IP address for lockout tracking
   * @returns {Promise<Object>} Authentication data with token
   * @throws {ApiError} If credentials are invalid or account is locked
   */
  static async login(email, password, ipAddress = null) {
    try {
      // Check account lockout before attempting login
      await checkAccountLockout(email, ipAddress);

      // Find the user by email
      const user = await User.findByEmail(email);

      // Check if user exists and verify password
      let isPasswordValid = false;
      if (user) {
        isPasswordValid = await comparePassword(password, user.password_hash);
      }

      // If credentials are invalid, record failed attempt
      if (!user || !isPasswordValid) {
        logger.warn('Failed login attempt', {
          email: email,
          ip: ipAddress,
          reason: !user ? 'user_not_found' : 'invalid_password'
        });

        // Record failed login attempt
        await recordFailedLoginAttempt(email, ipAddress);
        
        // Always return the same generic error message
        throw unauthorized('Invalid email or password');
      }

      // Clear failed login attempts on successful login
      await clearFailedLoginAttempts(email);

      // Generate token with extended payload
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      logger.info('Successful login', {
        userId: user.id,
        email: user.email,
        role: user.role,
        ip: ipAddress
      });

      return {
        token,
        user_id: user.id,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      };
    } catch (error) {
      logger.error(`Login error for email ${email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registered user
   * @throws {ApiError} If registration fails
   */
  static async register(userData) {
    try {
      // Check if email already exists
      const existingUser = await User.findByEmail(userData.email);

      if (existingUser) {
        throw conflict('Email is already registered');
      }

      // Create the user
      // Set default password if no password is provided
      if (!userData.password) {
        userData.password = 'Password123!';
      }

      const user = await User.create(userData);

      // Remove sensitive data
      const { password_hash, ...userWithoutPassword } = user;

      return userWithoutPassword;
    } catch (error) {
      if (error.code === '23505' && error.constraint.includes('users_email_key')) {
        // Handle unique constraint violation for email
        throw conflict('Email is already registered');
      }

      logger.error(`Registration error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a user has valid authentication
   * @param {Object} user - User object from request
   * @returns {Promise<Object>} User data
   * @throws {ApiError} If user is not authenticated
   */
  static async checkAuth(user) {
    try {
      if (!user || !user.id) {
        throw unauthorized('User not authenticated');
      }

      const userData = await User.findById(user.id);

      if (!userData) {
        throw unauthorized('User not found');
      }

      return userData;
    } catch (error) {
      logger.error(`Auth check error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AuthService;
