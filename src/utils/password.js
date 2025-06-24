const bcrypt = require('bcryptjs');
const logger = require('./logger');

// FIXED: Use environment variable for salt rounds with sensible defaults
// Production should use 12, development can use 8-10 for faster performance
const SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS
  ? parseInt(process.env.BCRYPT_SALT_ROUNDS)
  : (process.env.NODE_ENV === 'production' ? 12 : 8);

// Timeout settings for bcrypt operations
const HASH_TIMEOUT = parseInt(process.env.BCRYPT_HASH_TIMEOUT) || 20000; // 20 seconds
const COMPARE_TIMEOUT = parseInt(process.env.BCRYPT_COMPARE_TIMEOUT) || 10000; // 10 seconds

/**
 * Hash a password with timeout protection
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const startTime = Date.now();

  try {
    // Validate input
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    if (password.length > 128) {
      throw new Error('Password too long (max 128 characters)');
    }

    // Add timeout protection for bcrypt operations
    const hashPromise = (async () => {
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      return bcrypt.hash(password, salt);
    })();

    // Add a timeout wrapper
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Password hashing timeout')), HASH_TIMEOUT);
    });

    const hashedPassword = await Promise.race([hashPromise, timeoutPromise]);

    const duration = Date.now() - startTime;
    logger.debug('Password hashed successfully', {
      duration: `${duration}ms`,
      saltRounds: SALT_ROUNDS
    });

    return hashedPassword;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Password hashing error', {
      duration: `${duration}ms`,
      error: error.message,
      saltRounds: SALT_ROUNDS
    });

    if (error.message === 'Password hashing timeout') {
      throw new Error('Password hashing took too long - please try again');
    }

    throw error;
  }
};

/**
 * Compare a password with a hash with timeout protection
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} True if the password matches the hash
 */
const comparePassword = async (password, hashedPassword) => {
  const startTime = Date.now();

  try {
    // Validate input
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new Error('Hashed password must be a non-empty string');
    }

    // Add timeout protection for bcrypt operations
    const comparePromise = bcrypt.compare(password, hashedPassword);

    // Add a timeout wrapper
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Password comparison timeout')), COMPARE_TIMEOUT);
    });

    const isMatch = await Promise.race([comparePromise, timeoutPromise]);

    const duration = Date.now() - startTime;
    logger.debug('Password comparison completed', {
      duration: `${duration}ms`,
      match: isMatch
    });

    return isMatch;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Password comparison error', {
      duration: `${duration}ms`,
      error: error.message
    });

    if (error.message === 'Password comparison timeout') {
      throw new Error('Password verification took too long - please try again');
    }

    throw error;
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  SALT_ROUNDS, // Export for testing and configuration validation
};
