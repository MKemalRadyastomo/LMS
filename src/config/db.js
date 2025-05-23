const { Pool } = require('pg');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

// Database configuration with environment variables and sensible defaults
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production',
  
  // Connection pool settings
  max: process.env.NODE_ENV === 'test' ? 2 : parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  min: process.env.NODE_ENV === 'test' ? 1 : parseInt(process.env.DB_MIN_CONNECTIONS) || 2,
  
  // FIXED: Timeout settings - much more reasonable values
  idleTimeoutMillis: process.env.NODE_ENV === 'test' 
    ? 5000 
    : parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, // 30 seconds (was 1 second)
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000, // 10 seconds (was 1 second)
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000, // 30 seconds (was 5 seconds)
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000, // 30 seconds
  
  // Additional performance settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  application_name: `lms_${process.env.NODE_ENV || 'development'}`
};

// Create a connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Database pool error:', err);
});

pool.on('connect', (client) => {
  logger.info(`New database client connected (PID: ${client.processID})`);
});

pool.on('acquire', (client) => {
  logger.debug(`Database client acquired (PID: ${client.processID})`);
});

pool.on('remove', (client) => {
  logger.info(`Database client removed (PID: ${client.processID})`);
});

// Test the database connection with better error handling
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Error connecting to the database:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } else {
    logger.info('Successfully connected to the database', {
      host: dbConfig.host,
      database: dbConfig.database,
      user: dbConfig.user,
      processID: client.processID
    });
    release();
  }
});

// Export the pool to be used in other modules
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Export the pool for direct access
  end: () => pool.end(), // Add end method for tests
  getClient: async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    const startTime = Date.now();

    // FIXED: Increased timeout to 30 seconds and added better monitoring
    const CHECKOUT_TIMEOUT = parseInt(process.env.DB_CLIENT_CHECKOUT_TIMEOUT) || 30000;
    
    const timeout = setTimeout(() => {
      const duration = Date.now() - startTime;
      logger.warn('Database client checked out for extended period', {
        duration: `${duration}ms`,
        processID: client.processID,
        lastQuery: client.lastQuery,
        threshold: `${CHECKOUT_TIMEOUT}ms`
      });
    }, CHECKOUT_TIMEOUT);

    // Monkey patch the query method to keep track of the last query executed
    client.query = (...args) => {
      client.lastQuery = {
        query: args[0],
        params: args[1] ? '[PARAMS_HIDDEN]' : undefined, // Hide sensitive data
        timestamp: new Date().toISOString()
      };
      return query.apply(client, args);
    };

    client.release = () => {
      const duration = Date.now() - startTime;
      clearTimeout(timeout);
      
      logger.debug('Database client released', {
        duration: `${duration}ms`,
        processID: client.processID
      });
      
      // Restore original methods
      client.query = query;
      client.release = release;
      return release.apply(client);
    };

    return client;
  },
};
