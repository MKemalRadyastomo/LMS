const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const courseRoutes = require('./course.routes');
const assignmentRoutes = require('./assignment.routes');
const assignmentTemplateRoutes = require('./assignmentTemplate.routes');
const assignmentBulkRoutes = require('./assignmentBulk.routes');
const submissionRoutes = require('./submission.routes');
const courseContentRoutes = require('./courseContent.routes');
// const gradingRoutes = require('./grading.routes'); // Temporarily disabled - missing controller functions
const materialRoutes = require('./material.routes');
const searchRoutes = require('./search.routes');
const analyticsRoutes = require('./analytics.routes');
const userStatsRoutes = require('./userStats.routes');
const notificationRoutes = require('./notification.routes');

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
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
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

// Assignment template and bulk operation routes
router.use('/assignment-templates', assignmentTemplateRoutes);
router.use('/assignments/bulk', assignmentBulkRoutes);

// Material and grading routes
router.use('/', materialRoutes);
// router.use('/grading', gradingRoutes); // Temporarily disabled - missing controller functions

// Search routes
router.use('/search', searchRoutes);

// Analytics routes
router.use('/analytics', analyticsRoutes);

// Notification routes
router.use('/notifications', notificationRoutes);

// User statistics routes
router.use('/', userStatsRoutes);

// The general /courses route is last
router.use('/courses', courseRoutes);

module.exports = router;