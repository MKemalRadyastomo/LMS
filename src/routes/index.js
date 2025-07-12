const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const courseRoutes = require('./course.routes');
const assignmentRoutes = require('./assignment.routes');
const submissionRoutes = require('./submission.routes');
const courseContentRoutes = require('./courseContent.routes');
const gradingRoutes = require('./grading.routes');
const materialRoutes = require('./material.routes');
const searchRoutes = require('./search.routes');
const analyticsRoutes = require('./analytics.routes');
const userStatsRoutes = require('./userStats.routes');

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
 *
 * IMPORTANT: More specific routes must be registered BEFORE general routes.
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// Specific routes with /:courseId parameter go first
router.use('/courses/:courseId/assignments', assignmentRoutes);
router.use('/assignments/:assignmentId', submissionRoutes);
router.use('/courses/:courseId/contents', courseContentRoutes);

// Material and grading routes
router.use('/', materialRoutes);
router.use('/grading', gradingRoutes);

// Search routes
router.use('/search', searchRoutes);

// Analytics routes
router.use('/analytics', analyticsRoutes);

// User statistics routes
router.use('/', userStatsRoutes);

// The general /courses route is last
router.use('/courses', courseRoutes);

module.exports = router;