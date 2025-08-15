const AnalyticsService = require('../services/analytics.service');
const { ApiError } = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { default: httpStatus } = require('http-status');
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
 * Get performance metrics
 * GET /api/analytics/performance?timeframe={timeframe}&metric={metric}
 */
const getPerformanceMetrics = catchAsync(async (req, res) => {
  const { timeframe = 'week', metric = 'all' } = req.query;

  // Check permissions
  if (!['admin', 'guru'].includes(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Admin or Guru role required.');
  }

  const validTimeframes = ['day', 'week', 'month', 'year'];
  if (!validTimeframes.includes(timeframe)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`);
  }

  const db = require('../config/db');
  const timeCondition = getTimeCondition(timeframe);

  const metrics = {};

  if (metric === 'all' || metric === 'response_time') {
    // Get average response times from search analytics
    const responseTimeQuery = `
      SELECT 
        AVG(
          CASE 
            WHEN details->>'responseTime' ~ '^[0-9.]+$' 
            THEN (details->>'responseTime')::numeric 
            ELSE null 
          END
        ) as avg_response_time,
        COUNT(*) as total_requests
      FROM activity_logs
      WHERE activity_type = 'search' 
        AND ${timeCondition}
        AND details IS NOT NULL
    `;
    
    const responseTimeResult = await db.query(responseTimeQuery);
    metrics.response_time = {
      average_ms: parseFloat(responseTimeResult.rows[0].avg_response_time) || 0,
      total_requests: parseInt(responseTimeResult.rows[0].total_requests) || 0
    };
  }

  if (metric === 'all' || metric === 'user_engagement') {
    // Get user engagement metrics
    const engagementQuery = `
      SELECT 
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as total_activities,
        ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT user_id), 0), 2) as avg_activities_per_user,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM activity_logs
      WHERE ${timeCondition}
    `;
    
    const engagementResult = await db.query(engagementQuery);
    metrics.user_engagement = engagementResult.rows[0];
  }

  if (metric === 'all' || metric === 'content_performance') {
    // Get content performance metrics
    const contentQuery = `
      SELECT 
        'courses' as content_type,
        COUNT(*) as total_items,
        COUNT(CASE WHEN ${timeCondition} THEN 1 END) as created_in_period,
        AVG(
          CASE 
            WHEN ce.course_count IS NOT NULL 
            THEN ce.course_count 
            ELSE 0 
          END
        ) as avg_engagement
      FROM courses c
      LEFT JOIN (
        SELECT course_id, COUNT(*) as course_count
        FROM course_enrollments
        GROUP BY course_id
      ) ce ON c.id = ce.course_id
      
      UNION ALL
      
      SELECT 
        'assignments' as content_type,
        COUNT(*) as total_items,
        COUNT(CASE WHEN ${timeCondition} THEN 1 END) as created_in_period,
        AVG(
          CASE 
            WHEN s.submission_count IS NOT NULL 
            THEN s.submission_count 
            ELSE 0 
          END
        ) as avg_engagement
      FROM assignments a
      LEFT JOIN (
        SELECT assignment_id, COUNT(*) as submission_count
        FROM assignment_submissions
        GROUP BY assignment_id
      ) s ON a.id = s.assignment_id
      
      UNION ALL
      
      SELECT 
        'materials' as content_type,
        COUNT(*) as total_items,
        COUNT(CASE WHEN ${timeCondition} THEN 1 END) as created_in_period,
        0 as avg_engagement
      FROM materials m
    `;
    
    const contentResult = await db.query(contentQuery);
    metrics.content_performance = contentResult.rows;
  }

  if (metric === 'all' || metric === 'system_health') {
    // Get system health metrics
    const healthQuery = `
      SELECT 
        COUNT(CASE WHEN activity_type = 'login' THEN 1 END) as successful_logins,
        COUNT(CASE WHEN activity_type = 'login_failed' THEN 1 END) as failed_logins,
        COUNT(CASE WHEN activity_type = 'search' AND (details->>'resultCount')::int = 0 THEN 1 END) as zero_result_searches,
        COUNT(CASE WHEN activity_type = 'error' THEN 1 END) as error_count
      FROM activity_logs
      WHERE ${timeCondition}
    `;
    
    const healthResult = await db.query(healthQuery);
    metrics.system_health = healthResult.rows[0];
  }

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Performance metrics retrieved successfully',
    data: {
      timeframe,
      metrics,
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Get reports list and generate custom reports
 * GET /api/analytics/reports?type={type}&format={format}
 */
const getReports = catchAsync(async (req, res) => {
  const { type = 'summary', format = 'json' } = req.query;

  // Check permissions
  if (!['admin', 'guru'].includes(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Admin or Guru role required.');
  }

  const validTypes = ['summary', 'detailed', 'user_activity', 'content_usage', 'performance'];
  const validFormats = ['json', 'csv'];

  if (!validTypes.includes(type)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid report type. Must be one of: ${validTypes.join(', ')}`);
  }

  if (!validFormats.includes(format)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid format. Must be one of: ${validFormats.join(', ')}`);
  }

  const db = require('../config/db');
  let reportData = {};

  switch (type) {
    case 'summary':
      const summaryQuery = `
        SELECT 
          'users' as category,
          COUNT(*) as total,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent
        FROM users
        UNION ALL
        SELECT 
          'courses' as category,
          COUNT(*) as total,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent
        FROM courses
        UNION ALL
        SELECT 
          'assignments' as category,
          COUNT(*) as total,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent
        FROM assignments
        UNION ALL
        SELECT 
          'submissions' as category,
          COUNT(*) as total,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent
        FROM assignment_submissions
      `;
      
      const summaryResult = await db.query(summaryQuery);
      reportData = {
        summary: summaryResult.rows,
        generatedAt: new Date().toISOString()
      };
      break;

    case 'user_activity':
      const activityQuery = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.role,
          COUNT(al.id) as total_activities,
          MAX(al.created_at) as last_activity,
          COUNT(CASE WHEN al.activity_type = 'login' THEN 1 END) as login_count,
          COUNT(CASE WHEN al.activity_type = 'search' THEN 1 END) as search_count
        FROM users u
        LEFT JOIN activity_logs al ON u.id = al.user_id 
          AND al.created_at > NOW() - INTERVAL '30 days'
        WHERE u.role IN ('guru', 'siswa')
        GROUP BY u.id, u.name, u.email, u.role
        ORDER BY total_activities DESC
        LIMIT 100
      `;
      
      const activityResult = await db.query(activityQuery);
      reportData = {
        user_activity: activityResult.rows,
        generatedAt: new Date().toISOString()
      };
      break;

    case 'content_usage':
      const usageQuery = `
        SELECT 
          c.id,
          c.name as course_name,
          u.name as teacher_name,
          COUNT(DISTINCT ce.user_id) as enrolled_students,
          COUNT(DISTINCT a.id) as assignments_count,
          COUNT(DISTINCT m.id) as materials_count,
          COUNT(DISTINCT s.id) as submissions_count,
          ROUND(AVG(s.grade), 2) as avg_grade
        FROM courses c
        LEFT JOIN users u ON c.teacher_id = u.id
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
        LEFT JOIN assignments a ON c.id = a.course_id
        LEFT JOIN materials m ON c.id = m.course_id
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
        GROUP BY c.id, c.name, u.name
        ORDER BY enrolled_students DESC
        LIMIT 50
      `;
      
      const usageResult = await db.query(usageQuery);
      reportData = {
        content_usage: usageResult.rows,
        generatedAt: new Date().toISOString()
      };
      break;

    default:
      reportData = {
        message: `Report type '${type}' not implemented yet`,
        availableTypes: validTypes
      };
  }

  if (format === 'json') {
    res.status(httpStatus.OK).json({
      success: true,
      message: `${type} report generated successfully`,
      data: reportData
    });
  } else {
    // CSV format would need implementation
    res.status(httpStatus.NOT_IMPLEMENTED).json({
      success: false,
      message: 'CSV format not yet implemented. Please use JSON format.'
    });
  }
});

/**
 * Helper function to get time condition
 */
function getTimeCondition(timeframe) {
  switch (timeframe) {
    case 'day':
      return 'created_at > NOW() - INTERVAL \'1 day\'';
    case 'week':
      return 'created_at > NOW() - INTERVAL \'1 week\'';
    case 'month':
      return 'created_at > NOW() - INTERVAL \'1 month\'';
    case 'year':
      return 'created_at > NOW() - INTERVAL \'1 year\'';
    default:
      return 'created_at > NOW() - INTERVAL \'1 month\'';
  }
}

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
  getPerformanceMetrics,
  getReports,
  exportAnalyticsData
};