const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, requireRole, requirePermission } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const Joi = require('joi');

const router = express.Router();

// All analytics routes require authentication
router.use(authenticate);

/**
 * Validation schemas
 */
const timeframeValidation = {
  query: {
    timeframe: Joi.string().valid('day', 'week', 'month', 'year').default('month').optional()
  }
};

const courseIdValidation = {
  params: {
    courseId: Joi.number().integer().positive().required().messages({
      'number.base': 'Course ID must be a number',
      'number.positive': 'Course ID must be positive',
      'any.required': 'Course ID is required'
    })
  }
};

const assignmentIdValidation = {
  params: {
    assignmentId: Joi.number().integer().positive().required().messages({
      'number.base': 'Assignment ID must be a number',
      'number.positive': 'Assignment ID must be positive',
      'any.required': 'Assignment ID is required'
    })
  }
};

const studentIdValidation = {
  params: {
    studentId: Joi.number().integer().positive().required().messages({
      'number.base': 'Student ID must be a number',
      'number.positive': 'Student ID must be positive',
      'any.required': 'Student ID is required'
    })
  }
};

const userIdValidation = {
  params: {
    userId: Joi.number().integer().positive().required().messages({
      'number.base': 'User ID must be a number',
      'number.positive': 'User ID must be positive',
      'any.required': 'User ID is required'
    })
  }
};

const gradeDistributionValidation = {
  query: {
    courseId: Joi.number().integer().positive().optional(),
    assignmentId: Joi.number().integer().positive().optional(),
    timeframe: Joi.string().valid('day', 'week', 'month', 'year').default('month').optional()
  }
};

const activityTimelineValidation = {
  query: {
    timeframe: Joi.string().valid('day', 'week', 'month').default('week').optional(),
    userId: Joi.number().integer().positive().optional()
  }
};

const exportValidation = {
  body: {
    type: Joi.string().valid('dashboard', 'course', 'assignment', 'student', 'grades').required().messages({
      'any.required': 'Export type is required',
      'any.only': 'Invalid export type'
    }),
    format: Joi.string().valid('json', 'csv').default('json').optional(),
    filters: Joi.object({
      timeframe: Joi.string().valid('day', 'week', 'month', 'year').optional(),
      courseId: Joi.number().integer().positive().optional(),
      assignmentId: Joi.number().integer().positive().optional(),
      studentId: Joi.number().integer().positive().optional()
    }).optional().default({})
  }
};

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard analytics based on user role
 * @access  Private (All authenticated users)
 */
router.get(
  '/dashboard',
  validate(timeframeValidation),
  analyticsController.getDashboardAnalytics
);

/**
 * @route   GET /api/analytics/courses/:courseId
 * @desc    Get comprehensive course analytics
 * @access  Private (Course teachers, enrolled students, admins)
 */
router.get(
  '/courses/:courseId',
  validate({ ...courseIdValidation, ...timeframeValidation }),
  analyticsController.getCourseAnalytics
);

/**
 * @route   GET /api/analytics/assignments/:assignmentId
 * @desc    Get assignment performance analytics
 * @access  Private (Assignment creators, enrolled students, admins)
 */
router.get(
  '/assignments/:assignmentId',
  validate(assignmentIdValidation),
  analyticsController.getAssignmentAnalytics
);

/**
 * @route   GET /api/analytics/students/:studentId/insights
 * @desc    Get student learning insights and recommendations
 * @access  Private (Student themselves, their teachers, admins)
 */
router.get(
  '/students/:studentId/insights',
  validate(studentIdValidation),
  analyticsController.getStudentLearningInsights
);

/**
 * @route   GET /api/analytics/system/usage
 * @desc    Get system-wide usage analytics
 * @access  Private (Admin only)
 */
router.get(
  '/system/usage',
  requireRole(['admin']),
  validate(timeframeValidation),
  analyticsController.getSystemUsageAnalytics
);

/**
 * @route   GET /api/analytics/users/:userId/performance
 * @desc    Get user performance summary
 * @access  Private (User themselves, admins, teachers for their students)
 */
router.get(
  '/users/:userId/performance',
  validate({ ...userIdValidation, ...timeframeValidation }),
  analyticsController.getUserPerformanceSummary
);

/**
 * @route   GET /api/analytics/grades/distribution
 * @desc    Get grade distribution analytics
 * @access  Private (Admin and Teachers only)
 */
router.get(
  '/grades/distribution',
  requireRole(['admin', 'guru']),
  validate(gradeDistributionValidation),
  analyticsController.getGradeDistributionAnalytics
);

/**
 * @route   GET /api/analytics/activity/timeline
 * @desc    Get activity timeline analytics
 * @access  Private (All authenticated users with appropriate scope)
 */
router.get(
  '/activity/timeline',
  validate(activityTimelineValidation),
  analyticsController.getActivityTimelineAnalytics
);

/**
 * @route   GET /api/analytics/performance
 * @desc    Get performance metrics
 * @access  Private (Admin and Teachers only)
 */
router.get(
  '/performance',
  requireRole(['admin', 'guru']),
  validate({
    query: {
      timeframe: Joi.string().valid('day', 'week', 'month', 'year').default('week').optional(),
      metric: Joi.string().valid('all', 'response_time', 'user_engagement', 'content_performance', 'system_health').default('all').optional()
    }
  }),
  analyticsController.getPerformanceMetrics
);

/**
 * @route   GET /api/analytics/reports
 * @desc    Generate custom analytics reports
 * @access  Private (Admin and Teachers only)
 */
router.get(
  '/reports',
  requireRole(['admin', 'guru']),
  validate({
    query: {
      type: Joi.string().valid('summary', 'detailed', 'user_activity', 'content_usage', 'performance').default('summary').optional(),
      format: Joi.string().valid('json', 'csv').default('json').optional()
    }
  }),
  analyticsController.getReports
);

/**
 * @route   POST /api/analytics/export
 * @desc    Export analytics data in various formats
 * @access  Private (Admin and Teachers only)
 */
router.post(
  '/export',
  requireRole(['admin', 'guru']),
  validate(exportValidation),
  analyticsController.exportAnalyticsData
);

/**
 * Analytics routes for specific roles
 */

/**
 * @route   GET /api/analytics/teacher/summary
 * @desc    Get teacher-specific analytics summary
 * @access  Private (Teachers and Admins only)
 */
router.get(
  '/teacher/summary',
  requireRole(['guru', 'admin']),
  validate(timeframeValidation),
  analyticsController.getDashboardAnalytics
);

/**
 * @route   GET /api/analytics/student/progress
 * @desc    Get student progress analytics
 * @access  Private (Students for themselves, teachers for their students, admins)
 */
router.get(
  '/student/progress',
  validate(timeframeValidation),
  analyticsController.getDashboardAnalytics
);

/**
 * @route   GET /api/analytics/admin/overview
 * @desc    Get comprehensive admin overview
 * @access  Private (Admin only)
 */
router.get(
  '/admin/overview',
  requireRole(['admin']),
  validate(timeframeValidation),
  analyticsController.getDashboardAnalytics
);

module.exports = router;