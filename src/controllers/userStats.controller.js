const { default: httpStatus } = require('http-status');
const catchAsync = require('../utils/catchAsync');
const UserStats = require('../models/userStats.model');
const { ApiError } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Get user statistics
 * GET /api/users/:userId/statistics
 */
const getUserStatistics = catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  // Check if user is requesting their own stats or if admin/teacher
  if (req.user.role === 'siswa' && req.user.id !== parseInt(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only view your own statistics');
  }

  const statistics = await UserStats.getUserStatistics(userId);
  
  if (!statistics) {
    // If no statistics exist, create initial statistics
    await UserStats.updateUserStatistics(userId);
    const newStatistics = await UserStats.getUserStatistics(userId);
    
    return res.status(httpStatus.OK).json({
      success: true,
      data: newStatistics
    });
  }

  res.status(httpStatus.OK).json({
    success: true,
    data: statistics
  });
});

/**
 * Update user statistics
 * PUT /api/users/:userId/statistics
 */
const updateUserStatistics = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;

  // Only allow admin and the user themselves to update statistics
  if (req.user.role === 'siswa' && req.user.id !== parseInt(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only update your own statistics');
  }

  const updatedStatistics = await UserStats.updateUserStatistics(userId, updates);

  res.status(httpStatus.OK).json({
    success: true,
    data: updatedStatistics,
    message: 'User statistics updated successfully'
  });
});

/**
 * Get user course progress
 * GET /api/users/:userId/courses/:courseId/progress
 */
const getUserCourseProgress = catchAsync(async (req, res) => {
  const { userId, courseId } = req.params;

  // Check permissions
  if (req.user.role === 'siswa' && req.user.id !== parseInt(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only view your own course progress');
  }

  const progress = await UserStats.getUserCourseProgress(userId, courseId);

  if (!progress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course progress not found or user not enrolled in this course');
  }

  res.status(httpStatus.OK).json({
    success: true,
    data: progress
  });
});

/**
 * Get user learning streak
 * GET /api/users/:userId/streak
 */
const getUserLearningStreak = catchAsync(async (req, res) => {
  const { userId } = req.params;

  // Check permissions
  if (req.user.role === 'siswa' && req.user.id !== parseInt(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only view your own learning streak');
  }

  const streak = await UserStats.getUserLearningStreak(userId);

  res.status(httpStatus.OK).json({
    success: true,
    data: streak
  });
});

/**
 * Get user achievements/badges
 * GET /api/users/:userId/achievements
 */
const getUserAchievements = catchAsync(async (req, res) => {
  const { userId } = req.params;

  // Check permissions
  if (req.user.role === 'siswa' && req.user.id !== parseInt(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only view your own achievements');
  }

  const achievements = await UserStats.getUserAchievements(userId);

  res.status(httpStatus.OK).json({
    success: true,
    data: achievements
  });
});

/**
 * Log user activity
 * POST /api/users/:userId/activity
 */
const logUserActivity = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { activityType, resourceType, resourceId, details } = req.body;

  // Validate required fields
  if (!activityType) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Activity type is required');
  }

  // Users can only log their own activity, except admins
  if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only log your own activity');
  }

  const activity = await UserStats.logUserActivity(
    userId, 
    activityType, 
    resourceType, 
    resourceId, 
    details
  );

  res.status(httpStatus.CREATED).json({
    success: true,
    data: activity,
    message: 'Activity logged successfully'
  });
});

/**
 * Get user activity history
 * GET /api/users/:userId/activity
 */
const getUserActivityHistory = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { 
    activityType, 
    resourceType, 
    startDate, 
    endDate, 
    limit = 50, 
    offset = 0 
  } = req.query;

  // Check permissions
  if (req.user.role === 'siswa' && req.user.id !== parseInt(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only view your own activity history');
  }

  const filters = {
    activityType,
    resourceType,
    startDate,
    endDate,
    limit: parseInt(limit),
    offset: parseInt(offset)
  };

  const activities = await UserStats.getUserActivityHistory(userId, filters);

  res.status(httpStatus.OK).json({
    success: true,
    data: activities,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: activities.length
    }
  });
});

/**
 * Get user leaderboard position
 * GET /api/users/:userId/leaderboard/:metric
 */
const getUserLeaderboardPosition = catchAsync(async (req, res) => {
  const { userId, metric } = req.params;

  // Validate metric
  const validMetrics = ['grade', 'assignments', 'courses'];
  if (!validMetrics.includes(metric)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid metric. Must be one of: ${validMetrics.join(', ')}`);
  }

  // Check permissions
  if (req.user.role === 'siswa' && req.user.id !== parseInt(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only view your own leaderboard position');
  }

  const position = await UserStats.getUserLeaderboardPosition(userId, metric);

  if (!position) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found in leaderboard or no data available');
  }

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      metric,
      ...position
    }
  });
});

/**
 * Get overall system statistics (admin only)
 * GET /api/statistics/system
 */
const getSystemStatistics = catchAsync(async (req, res) => {
  // Only admin can view system statistics
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Admin access required');
  }

  // This would typically involve aggregating data across all users
  // For now, we'll implement a basic version
  const systemStats = {
    total_users: 0,
    total_courses: 0,
    total_assignments: 0,
    total_submissions: 0,
    average_completion_rate: 0,
    active_users_today: 0,
    active_users_week: 0
  };

  // TODO: Implement actual system statistics queries
  logger.info('System statistics requested by admin', { adminId: req.user.id });

  res.status(httpStatus.OK).json({
    success: true,
    data: systemStats,
    message: 'System statistics retrieved successfully'
  });
});

/**
 * Get leaderboard for specific metric (admin/teacher only)
 * GET /api/statistics/leaderboard/:metric
 */
const getLeaderboard = catchAsync(async (req, res) => {
  const { metric } = req.params;
  const { limit = 10, role = 'siswa' } = req.query;

  // Only admin and teachers can view full leaderboards
  if (req.user.role === 'siswa') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Students cannot view full leaderboards');
  }

  // Validate metric
  const validMetrics = ['grade', 'assignments', 'courses'];
  if (!validMetrics.includes(metric)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid metric. Must be one of: ${validMetrics.join(', ')}`);
  }

  // TODO: Implement actual leaderboard query
  const leaderboard = [];

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      metric,
      role,
      limit: parseInt(limit),
      users: leaderboard
    }
  });
});

/**
 * Refresh user statistics (recalculate from actual data)
 * POST /api/users/:userId/statistics/refresh
 */
const refreshUserStatistics = catchAsync(async (req, res) => {
  const { userId } = req.params;

  // Only admin and the user themselves can refresh statistics
  if (req.user.role === 'siswa' && req.user.id !== parseInt(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only refresh your own statistics');
  }

  // Force recalculation of statistics
  const refreshedStats = await UserStats.updateUserStatistics(userId);

  logger.info('User statistics refreshed', { 
    userId, 
    refreshedBy: req.user.id,
    refreshedByRole: req.user.role 
  });

  res.status(httpStatus.OK).json({
    success: true,
    data: refreshedStats,
    message: 'User statistics refreshed successfully'
  });
});

module.exports = {
  getUserStatistics,
  updateUserStatistics,
  getUserCourseProgress,
  getUserLearningStreak,
  getUserAchievements,
  logUserActivity,
  getUserActivityHistory,
  getUserLeaderboardPosition,
  getSystemStatistics,
  getLeaderboard,
  refreshUserStatistics
};