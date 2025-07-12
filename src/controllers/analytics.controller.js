const AnalyticsService = require('../services/analytics.service');
const { ApiError } = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const httpStatus = require('http-status');
const logger = require('../utils/logger');

/**
 * Analytics Controller - Handles analytics-related HTTP requests
 */

/**
 * Get dashboard analytics
 * GET /api/analytics/dashboard?timeframe={timeframe}
 */
const getDashboardAnalytics = catchAsync(async (req, res) => {
  const { timeframe = 'month' } = req.query;

  // Validate timeframe
  const validTimeframes = ['day', 'week', 'month', 'year'];
  if (!validTimeframes.includes(timeframe)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`);
  }

  const analytics = await AnalyticsService.getDashboardAnalytics(req.user, timeframe);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Dashboard analytics retrieved successfully',
    data: analytics
  });
});

/**
 * Get course analytics
 * GET /api/analytics/courses/:courseId?timeframe={timeframe}
 */
const getCourseAnalytics = catchAsync(async (req, res) => {
  const { courseId } = req.params;

  // Validate courseId
  if (!courseId || isNaN(parseInt(courseId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid course ID');
  }

  const analytics = await AnalyticsService.getCourseAnalytics(parseInt(courseId), req.user);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Course analytics retrieved successfully',
    data: analytics
  });
});

/**
 * Get assignment analytics
 * GET /api/analytics/assignments/:assignmentId
 */
const getAssignmentAnalytics = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;

  // Validate assignmentId
  if (!assignmentId || isNaN(parseInt(assignmentId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid assignment ID');
  }

  const analytics = await AnalyticsService.getAssignmentAnalytics(parseInt(assignmentId), req.user);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Assignment analytics retrieved successfully',
    data: analytics
  });
});

/**
 * Get student learning insights
 * GET /api/analytics/students/:studentId/insights
 */
const getStudentLearningInsights = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  // Validate studentId
  if (!studentId || isNaN(parseInt(studentId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid student ID');
  }

  const insights = await AnalyticsService.getStudentLearningInsights(parseInt(studentId), req.user);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Student learning insights retrieved successfully',
    data: insights
  });
});

/**
 * Get system usage analytics (Admin only)
 * GET /api/analytics/system/usage?timeframe={timeframe}
 */
const getSystemUsageAnalytics = catchAsync(async (req, res) => {
  // Check admin permission
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Admin role required.');
  }

  const { timeframe = 'month' } = req.query;

  // Validate timeframe
  const validTimeframes = ['day', 'week', 'month', 'year'];
  if (!validTimeframes.includes(timeframe)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`);
  }

  const analytics = await AnalyticsService.getSystemUsageAnalytics(timeframe);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'System usage analytics retrieved successfully',
    data: analytics
  });
});

/**
 * Get user performance summary
 * GET /api/analytics/users/:userId/performance?timeframe={timeframe}
 */
const getUserPerformanceSummary = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { timeframe = 'month' } = req.query;

  // Validate userId
  if (!userId || isNaN(parseInt(userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
  }

  // Check permissions - users can only view their own performance unless admin/guru
  const targetUserId = parseInt(userId);
  if (req.user.role === 'siswa' && req.user.id !== targetUserId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. You can only view your own performance.');
  }

  // For guru role, check if they teach the student
  if (req.user.role === 'guru') {
    // Implementation would check if guru teaches any courses the student is enrolled in
    // For now, allow access
  }

  const analytics = await AnalyticsService.getDashboardAnalytics(
    { id: targetUserId, role: 'siswa' }, // Temporarily set role for student analytics
    timeframe
  );

  res.status(httpStatus.OK).json({
    success: true,
    message: 'User performance summary retrieved successfully',
    data: analytics
  });
});

/**
 * Get grade distribution analytics
 * GET /api/analytics/grades/distribution?courseId={courseId}&assignmentId={assignmentId}&timeframe={timeframe}
 */
const getGradeDistributionAnalytics = catchAsync(async (req, res) => {
  const { courseId, assignmentId, timeframe = 'month' } = req.query;

  // Validate permissions
  if (!['admin', 'guru'].includes(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Admin or Teacher role required.');
  }

  const db = require('../config/db');
  let query = '';
  let params = [];

  if (assignmentId) {
    // Grade distribution for specific assignment
    query = `
      SELECT 
        'assignment' as scope,
        a.title as name,
        COUNT(CASE WHEN s.grade >= 90 THEN 1 END) as a_grades,
        COUNT(CASE WHEN s.grade >= 80 AND s.grade < 90 THEN 1 END) as b_grades,
        COUNT(CASE WHEN s.grade >= 70 AND s.grade < 80 THEN 1 END) as c_grades,
        COUNT(CASE WHEN s.grade >= 60 AND s.grade < 70 THEN 1 END) as d_grades,
        COUNT(CASE WHEN s.grade < 60 THEN 1 END) as f_grades,
        COUNT(*) as total_grades,
        ROUND(AVG(s.grade), 2) as average_grade,
        MIN(s.grade) as min_grade,
        MAX(s.grade) as max_grade
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      WHERE s.assignment_id = $1 AND s.grade IS NOT NULL
        AND (c.teacher_id = $2 OR $3 = 'admin')
      GROUP BY a.id, a.title
    `;
    params = [assignmentId, req.user.id, req.user.role];
  } else if (courseId) {
    // Grade distribution for course
    query = `
      SELECT 
        'course' as scope,
        c.name as name,
        COUNT(CASE WHEN s.grade >= 90 THEN 1 END) as a_grades,
        COUNT(CASE WHEN s.grade >= 80 AND s.grade < 90 THEN 1 END) as b_grades,
        COUNT(CASE WHEN s.grade >= 70 AND s.grade < 80 THEN 1 END) as c_grades,
        COUNT(CASE WHEN s.grade >= 60 AND s.grade < 70 THEN 1 END) as d_grades,
        COUNT(CASE WHEN s.grade < 60 THEN 1 END) as f_grades,
        COUNT(*) as total_grades,
        ROUND(AVG(s.grade), 2) as average_grade,
        MIN(s.grade) as min_grade,
        MAX(s.grade) as max_grade
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      WHERE c.id = $1 AND s.grade IS NOT NULL
        AND (c.teacher_id = $2 OR $3 = 'admin')
      GROUP BY c.id, c.name
    `;
    params = [courseId, req.user.id, req.user.role];
  } else {
    // Overall grade distribution for teacher's courses or system-wide for admin
    if (req.user.role === 'admin') {
      query = `
        SELECT 
          'system' as scope,
          'System Wide' as name,
          COUNT(CASE WHEN s.grade >= 90 THEN 1 END) as a_grades,
          COUNT(CASE WHEN s.grade >= 80 AND s.grade < 90 THEN 1 END) as b_grades,
          COUNT(CASE WHEN s.grade >= 70 AND s.grade < 80 THEN 1 END) as c_grades,
          COUNT(CASE WHEN s.grade >= 60 AND s.grade < 70 THEN 1 END) as d_grades,
          COUNT(CASE WHEN s.grade < 60 THEN 1 END) as f_grades,
          COUNT(*) as total_grades,
          ROUND(AVG(s.grade), 2) as average_grade,
          MIN(s.grade) as min_grade,
          MAX(s.grade) as max_grade
        FROM assignment_submissions s
        WHERE s.grade IS NOT NULL
      `;
      params = [];
    } else {
      query = `
        SELECT 
          'teacher' as scope,
          'My Courses' as name,
          COUNT(CASE WHEN s.grade >= 90 THEN 1 END) as a_grades,
          COUNT(CASE WHEN s.grade >= 80 AND s.grade < 90 THEN 1 END) as b_grades,
          COUNT(CASE WHEN s.grade >= 70 AND s.grade < 80 THEN 1 END) as c_grades,
          COUNT(CASE WHEN s.grade >= 60 AND s.grade < 70 THEN 1 END) as d_grades,
          COUNT(CASE WHEN s.grade < 60 THEN 1 END) as f_grades,
          COUNT(*) as total_grades,
          ROUND(AVG(s.grade), 2) as average_grade,
          MIN(s.grade) as min_grade,
          MAX(s.grade) as max_grade
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE c.teacher_id = $1 AND s.grade IS NOT NULL
      `;
      params = [req.user.id];
    }
  }

  const result = await db.query(query, params);
  const distribution = result.rows[0];

  if (!distribution) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No grade data found for the specified criteria');
  }

  // Calculate percentages
  const total = parseInt(distribution.total_grades);
  if (total > 0) {
    distribution.percentages = {
      a_grades: Math.round((distribution.a_grades / total) * 100),
      b_grades: Math.round((distribution.b_grades / total) * 100),
      c_grades: Math.round((distribution.c_grades / total) * 100),
      d_grades: Math.round((distribution.d_grades / total) * 100),
      f_grades: Math.round((distribution.f_grades / total) * 100)
    };
  }

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Grade distribution analytics retrieved successfully',
    data: distribution
  });
});

/**
 * Get activity timeline analytics
 * GET /api/analytics/activity/timeline?timeframe={timeframe}&userId={userId}
 */
const getActivityTimelineAnalytics = catchAsync(async (req, res) => {
  const { timeframe = 'week', userId } = req.query;

  // Check permissions
  if (userId && req.user.role === 'siswa' && req.user.id !== parseInt(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. You can only view your own activity.');
  }

  const db = require('../config/db');
  let timeCondition = '';
  let groupBy = '';

  switch (timeframe) {
    case 'day':
      timeCondition = 'created_at > NOW() - INTERVAL \'24 hours\'';
      groupBy = 'DATE_TRUNC(\'hour\', created_at)';
      break;
    case 'week':
      timeCondition = 'created_at > NOW() - INTERVAL \'1 week\'';
      groupBy = 'DATE(created_at)';
      break;
    case 'month':
      timeCondition = 'created_at > NOW() - INTERVAL \'1 month\'';
      groupBy = 'DATE(created_at)';
      break;
    default:
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid timeframe. Must be day, week, or month');
  }

  let query = `
    SELECT 
      ${groupBy} as time_period,
      activity_type,
      COUNT(*) as activity_count
    FROM activity_logs
    WHERE ${timeCondition}
  `;

  const params = [];
  let paramCount = 0;

  if (userId) {
    query += ` AND user_id = $${++paramCount}`;
    params.push(parseInt(userId));
  } else if (req.user.role === 'guru') {
    // Show activities related to teacher's courses
    query += ` AND (user_id = $${++paramCount} OR user_id IN (
      SELECT DISTINCT ce.user_id FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      WHERE c.teacher_id = $${paramCount}
    ))`;
    params.push(req.user.id);
  } else if (req.user.role === 'siswa') {
    query += ` AND user_id = $${++paramCount}`;
    params.push(req.user.id);
  }

  query += ` GROUP BY ${groupBy}, activity_type ORDER BY time_period DESC, activity_count DESC`;

  const result = await db.query(query, params);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Activity timeline analytics retrieved successfully',
    data: {
      timeline: result.rows,
      timeframe,
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Export analytics data
 * POST /api/analytics/export
 */
const exportAnalyticsData = catchAsync(async (req, res) => {
  const { type, format, filters = {} } = req.body;

  // Validate required fields
  if (!type) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Export type is required');
  }

  const validTypes = ['dashboard', 'course', 'assignment', 'student', 'grades'];
  if (!validTypes.includes(type)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid export type. Must be one of: ${validTypes.join(', ')}`);
  }

  const validFormats = ['json', 'csv'];
  const exportFormat = format || 'json';
  if (!validFormats.includes(exportFormat)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid format. Must be one of: ${validFormats.join(', ')}`);
  }

  // Check permissions
  if (!['admin', 'guru'].includes(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Admin or Teacher role required.');
  }

  let data;
  let filename;

  try {
    switch (type) {
      case 'dashboard':
        data = await AnalyticsService.getDashboardAnalytics(req.user, filters.timeframe);
        filename = `dashboard-analytics-${Date.now()}`;
        break;
      case 'course':
        if (!filters.courseId) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Course ID is required for course analytics export');
        }
        data = await AnalyticsService.getCourseAnalytics(filters.courseId, req.user);
        filename = `course-${filters.courseId}-analytics-${Date.now()}`;
        break;
      default:
        throw new ApiError(httpStatus.BAD_REQUEST, `Export type '${type}' not yet implemented`);
    }

    if (exportFormat === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.status(httpStatus.OK).json(data);
    } else if (exportFormat === 'csv') {
      // For CSV export, we would need to implement CSV conversion
      // For now, return JSON with a note
      res.status(httpStatus.NOT_IMPLEMENTED).json({
        success: false,
        message: 'CSV export format not yet implemented. Please use JSON format.'
      });
    }
  } catch (error) {
    logger.error(`Analytics export error: ${error.message}`);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to export analytics data');
  }
});

module.exports = {
  getDashboardAnalytics,
  getCourseAnalytics,
  getAssignmentAnalytics,
  getStudentLearningInsights,
  getSystemUsageAnalytics,
  getUserPerformanceSummary,
  getGradeDistributionAnalytics,
  getActivityTimelineAnalytics,
  exportAnalyticsData
};