const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const userStatsController = require('../controllers/userStats.controller');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Apply authentication to all user statistics routes
router.use(authenticate);

/**
 * User Statistics Routes
 */

// Get user statistics
router.get(
  '/users/:userId/statistics',
  requireRole(['admin', 'guru', 'siswa']),
  userStatsController.getUserStatistics
);

// Update user statistics
router.put(
  '/users/:userId/statistics',
  requireRole(['admin', 'guru', 'siswa']),
  userStatsController.updateUserStatistics
);

// Refresh user statistics (force recalculation)
router.post(
  '/users/:userId/statistics/refresh',
  requireRole(['admin', 'guru', 'siswa']),
  userStatsController.refreshUserStatistics
);

/**
 * User Progress and Activity Routes
 */

// Get user course progress
router.get(
  '/users/:userId/courses/:courseId/progress',
  requireRole(['admin', 'guru', 'siswa']),
  userStatsController.getUserCourseProgress
);

// Get user learning streak
router.get(
  '/users/:userId/streak',
  requireRole(['admin', 'guru', 'siswa']),
  userStatsController.getUserLearningStreak
);

// Get user achievements/badges
router.get(
  '/users/:userId/achievements',
  requireRole(['admin', 'guru', 'siswa']),
  userStatsController.getUserAchievements
);

// Log user activity
router.post(
  '/users/:userId/activity',
  requireRole(['admin', 'guru', 'siswa']),
  userStatsController.logUserActivity
);

// Get user activity history
router.get(
  '/users/:userId/activity',
  requireRole(['admin', 'guru', 'siswa']),
  userStatsController.getUserActivityHistory
);

// Get user leaderboard position
router.get(
  '/users/:userId/leaderboard/:metric',
  requireRole(['admin', 'guru', 'siswa']),
  userStatsController.getUserLeaderboardPosition
);

/**
 * System-wide Statistics Routes (Admin/Teacher only)
 */

// Get overall system statistics (admin only)
router.get(
  '/statistics/system',
  requireRole(['admin']),
  userStatsController.getSystemStatistics
);

// Get leaderboard for specific metric (admin/teacher only)
router.get(
  '/statistics/leaderboard/:metric',
  requireRole(['admin', 'guru']),
  userStatsController.getLeaderboard
);

/**
 * Route parameter validation middleware
 */
router.param('userId', (req, res, next, userId) => {
  if (!userId || isNaN(parseInt(userId))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID'
    });
  }
  next();
});

router.param('courseId', (req, res, next, courseId) => {
  if (!courseId || isNaN(parseInt(courseId))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid course ID'
    });
  }
  next();
});

router.param('metric', (req, res, next, metric) => {
  const validMetrics = ['grade', 'assignments', 'courses'];
  if (!validMetrics.includes(metric)) {
    return res.status(400).json({
      success: false,
      message: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`
    });
  }
  next();
});

module.exports = router;