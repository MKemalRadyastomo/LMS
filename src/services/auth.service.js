const User = require('../models/user.model');
const { comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { unauthorized, badRequest, conflict } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Authentication Service
 */
class AuthService {
  /**
   * Login a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Authentication data with token
   * @throws {ApiError} If credentials are invalid
   */
  static async login(email, password) {
    try {
      // Find the user by email
      const user = await User.findByEmail(email);
      
      // Check if user exists
      if (!user) {
        throw unauthorized('Invalid credentials');
      }
      
      // Verify password
      const isPasswordValid = await comparePassword(password, user.password_hash);
      
      if (!isPasswordValid) {
        throw unauthorized('Invalid credentials');
      }
      
      // Generate token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });
      
      return {
        token,
        user_id: user.id
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
