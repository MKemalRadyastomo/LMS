const logger = require('./logger');

/**
 * Configuration Validator
 * Validates environment variables and provides sensible defaults
 */
class ConfigValidator {
  /**
   * Validate database configuration
   */
  static validateDatabaseConfig() {
    const errors = [];
    const warnings = [];

    // Required database variables
    const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    for (const key of required) {
      if (!process.env[key]) {
        errors.push(`Missing required environment variable: ${key}`);
      }
    }

    // Validate timeout values
    const timeouts = {
      DB_CONNECTION_TIMEOUT: { min: 1000, max: 60000, default: 10000 },
      DB_STATEMENT_TIMEOUT: { min: 5000, max: 300000, default: 30000 },
      DB_IDLE_TIMEOUT: { min: 1000, max: 600000, default: 30000 },
      DB_QUERY_TIMEOUT: { min: 5000, max: 300000, default: 30000 },
      DB_CLIENT_CHECKOUT_TIMEOUT: { min: 5000, max: 120000, default: 30000 }
    };

    Object.entries(timeouts).forEach(([key, config]) => {
      const value = parseInt(process.env[key]);
      if (process.env[key] && isNaN(value)) {
        errors.push(`${key} must be a valid number`);
      } else if (value && (value < config.min || value > config.max)) {
        warnings.push(`${key}=${value} is outside recommended range ${config.min}-${config.max}ms`);
      }
    });

    // Validate connection pool settings
    const maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS) || 20;
    const minConnections = parseInt(process.env.DB_MIN_CONNECTIONS) || 2;

    if (maxConnections < minConnections) {
      errors.push('DB_MAX_CONNECTIONS must be greater than DB_MIN_CONNECTIONS');
    }

    if (maxConnections > 100) {
      warnings.push('DB_MAX_CONNECTIONS > 100 may cause resource issues');
    }

    return { errors, warnings };
  }

  /**
   * Validate password hashing configuration
   */
  static validatePasswordConfig() {
    const errors = [];
    const warnings = [];

    // Validate bcrypt salt rounds
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS);
    if (process.env.BCRYPT_SALT_ROUNDS && isNaN(saltRounds)) {
      errors.push('BCRYPT_SALT_ROUNDS must be a valid number');
    } else if (saltRounds) {
      if (saltRounds < 4) {
        errors.push('BCRYPT_SALT_ROUNDS should be at least 4 for security');
      } else if (saltRounds > 15) {
        warnings.push('BCRYPT_SALT_ROUNDS > 15 may cause performance issues');
      }
    }

    // Validate bcrypt timeouts
    const hashTimeout = parseInt(process.env.BCRYPT_HASH_TIMEOUT);
    const compareTimeout = parseInt(process.env.BCRYPT_COMPARE_TIMEOUT);

    if (process.env.BCRYPT_HASH_TIMEOUT && (isNaN(hashTimeout) || hashTimeout < 1000)) {
      errors.push('BCRYPT_HASH_TIMEOUT must be at least 1000ms');
    }

    if (process.env.BCRYPT_COMPARE_TIMEOUT && (isNaN(compareTimeout) || compareTimeout < 1000)) {
      errors.push('BCRYPT_COMPARE_TIMEOUT must be at least 1000ms');
    }

    return { errors, warnings };
  }

  /**
   * Validate timeout configuration
   */
  static validateTimeoutConfig() {
    const errors = [];
    const warnings = [];

    const requestTimeout = parseInt(process.env.REQUEST_TIMEOUT);
    if (process.env.REQUEST_TIMEOUT && isNaN(requestTimeout)) {
      errors.push('REQUEST_TIMEOUT must be a valid number');
    } else if (requestTimeout) {
      if (requestTimeout < 5000) {
        warnings.push('REQUEST_TIMEOUT < 5000ms may cause legitimate requests to timeout');
      } else if (requestTimeout > 300000) {
        warnings.push('REQUEST_TIMEOUT > 300000ms (5 minutes) is very long');
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate JWT configuration
   */
  static validateJWTConfig() {
    const errors = [];
    const warnings = [];

    if (!process.env.JWT_SECRET) {
      errors.push('Missing required environment variable: JWT_SECRET');
    } else if (process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters for security');
    }

    if (!process.env.JWT_EXPIRATION) {
      warnings.push('JWT_EXPIRATION not set, using default (1d)');
    }

    return { errors, warnings };
  }

  /**
   * Validate all configuration
   */
  static validateAll() {
    const allErrors = [];
    const allWarnings = [];

    const configs = [
      this.validateDatabaseConfig(),
      this.validatePasswordConfig(),
      this.validateTimeoutConfig(),
      this.validateJWTConfig()
    ];

    configs.forEach(({ errors, warnings }) => {
      allErrors.push(...errors);
      allWarnings.push(...warnings);
    });

    // Log results
    if (allErrors.length > 0) {
      logger.error('Configuration validation failed:', { errors: allErrors });
      console.error('\n❌ Configuration Errors:');
      allErrors.forEach(error => console.error(`  - ${error}`));
    }

    if (allWarnings.length > 0) {
      logger.warn('Configuration warnings:', { warnings: allWarnings });
      console.warn('\n⚠️  Configuration Warnings:');
      allWarnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    if (allErrors.length === 0 && allWarnings.length === 0) {
      logger.info('Configuration validation passed');
      console.log('✅ Configuration validation passed');
    }

    // Exit if there are critical errors
    if (allErrors.length > 0) {
      console.error('\n💥 Please fix configuration errors before starting the application.\n');
      process.exit(1);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Get current configuration summary
   */
  static getConfigSummary() {
    return {
      environment: process.env.NODE_ENV || 'development',
      database: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        maxConnections: process.env.DB_MAX_CONNECTIONS || '20',
        connectionTimeout: process.env.DB_CONNECTION_TIMEOUT || '10000',
        statementTimeout: process.env.DB_STATEMENT_TIMEOUT || '30000'
      },
      security: {
        jwtExpiration: process.env.JWT_EXPIRATION || '1d',
        bcryptSaltRounds: process.env.BCRYPT_SALT_ROUNDS || '8 (dev) / 12 (prod)',
        requestTimeout: process.env.REQUEST_TIMEOUT || '60000'
      },
      rateLimiting: {
        window: process.env.RATE_LIMIT_WINDOW || '15',
        max: process.env.RATE_LIMIT_MAX || '100'
      }
    };
  }
}

module.exports = ConfigValidator;
