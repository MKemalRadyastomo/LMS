const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const courseRoutes = require('./course.routes');
const assignmentRoutes = require('./assignment.routes');
const courseContentRoutes = require('./courseContent.routes');
const reportRoutes = require('./report.routes');

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
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  // Your health check logic...
});

/**
 * Register route groups
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// All assignment-related routes, including submissions, are now handled by assignmentRoutes
router.use('/courses/:courseId/assignments', assignmentRoutes);

router.use('/courses/:courseId/contents', courseContentRoutes);

// The general /courses route is last
router.use('/courses', courseRoutes);

router.use('/reports', reportRoutes);

module.exports = router;
