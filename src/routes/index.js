const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const courseRoutes = require('./course.routes');
const assignmentRoutes = require('./assignment.routes');

const router = express.Router();

/**
 * API version endpoint
 */
router.get('/api-version', (req, res) => {
  res.status(200).json({
    version: '1.0.0',
    release_date: '2025-05-16',
    deprecated: false,
    sunset_date: null
  });
});

/**
 * Health check endpoint for debugging timeout issues
 */
router.get('/health', async (req, res) => {
  const startTime = Date.now();

  try {
    // Test database connection
    const db = require('../config/db');
    const dbTest = await db.query('SELECT NOW() as current_time, version() as db_version');

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: {
        connected: true,
        response_time: Date.now() - startTime,
        version: dbTest.rows[0].db_version.split(' ')[0],
        current_time: dbTest.rows[0].current_time
      },
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      },
      configuration: {
        timeouts: {
          request: process.env.REQUEST_TIMEOUT || '60000',
          db_connection: process.env.DB_CONNECTION_TIMEOUT || '10000',
          db_statement: process.env.DB_STATEMENT_TIMEOUT || '30000'
        },
        bcrypt_rounds: process.env.BCRYPT_SALT_ROUNDS || '8 (dev) / 12 (prod)'
      }
    };

    res.status(200).json(healthData);
  } catch (error) {
    const duration = Date.now() - startTime;
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      response_time: duration,
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

/**
 * Register route groups
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/courses', assignmentRoutes); // Mount assignment routes under /courses

module.exports = router;
