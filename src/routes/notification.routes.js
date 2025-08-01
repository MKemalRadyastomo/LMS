const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { authenticate, requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const Joi = require('joi');

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * Validation schemas
 */
const notificationQueryValidation = {
  query: {
    status: Joi.string().valid('unread', 'read', 'archived').optional(),
    type: Joi.string().valid('info', 'success', 'warning', 'error', 'assignment', 'course', 'system').optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional(),
    includeArchived: Joi.boolean().default(false).optional()
  }
};

const notificationIdValidation = {
  params: {
    id: Joi.number().integer().positive().required().messages({
      'number.base': 'Notification ID must be a number',
      'number.positive': 'Notification ID must be positive',
      'any.required': 'Notification ID is required'
    })
  }
};

const createNotificationValidation = {
  body: {
    userIds: Joi.array().items(Joi.number().integer().positive()).min(1).required().messages({
      'array.min': 'At least one user ID is required',
      'any.required': 'User IDs are required'
    }),
    title: Joi.string().min(1).max(255).required().messages({
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title cannot exceed 255 characters',
      'any.required': 'Title is required'
    }),
    message: Joi.string().min(1).max(2000).required().messages({
      'string.min': 'Message must be at least 1 character long',
      'string.max': 'Message cannot exceed 2000 characters',
      'any.required': 'Message is required'
    }),
    type: Joi.string().valid('info', 'success', 'warning', 'error', 'assignment', 'course', 'system').default('info').optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium').optional(),
    relatedType: Joi.string().valid('course', 'assignment', 'material', 'submission', 'grade').optional(),
    relatedId: Joi.number().integer().positive().optional(),
    actionUrl: Joi.string().uri({ allowRelative: true }).max(500).optional(),
    actionLabel: Joi.string().max(100).optional(),
    metadata: Joi.object().optional(),
    expiresAt: Joi.date().iso().greater('now').optional()
  }
};

const templateNotificationValidation = {
  body: {
    templateName: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Template name must be at least 1 character long',
      'string.max': 'Template name cannot exceed 100 characters',
      'any.required': 'Template name is required'
    }),
    userIds: Joi.array().items(Joi.number().integer().positive()).min(1).required().messages({
      'array.min': 'At least one user ID is required',
      'any.required': 'User IDs are required'
    }),
    variables: Joi.object().optional().default({})
  }
};

const markMultipleReadValidation = {
  body: {
    notificationIds: Joi.array().items(Joi.number().integer().positive()).min(1).required().messages({
      'array.min': 'At least one notification ID is required',
      'any.required': 'Notification IDs are required'
    })
  }
};

const preferencesValidation = {
  body: {
    email_enabled: Joi.boolean().optional(),
    email_frequency: Joi.string().valid('immediate', 'daily', 'weekly', 'never').optional(),
    push_enabled: Joi.boolean().optional(),
    push_assignments: Joi.boolean().optional(),
    push_grades: Joi.boolean().optional(),
    push_course_updates: Joi.boolean().optional(),
    push_system_alerts: Joi.boolean().optional(),
    websocket_enabled: Joi.boolean().optional(),
    notification_types: Joi.object().optional(),
    quiet_hours_enabled: Joi.boolean().optional(),
    quiet_hours_start: Joi.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    quiet_hours_end: Joi.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    quiet_hours_timezone: Joi.string().max(50).optional()
  }
};

const announcementValidation = {
  body: {
    title: Joi.string().min(1).max(255).required().messages({
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title cannot exceed 255 characters',
      'any.required': 'Title is required'
    }),
    message: Joi.string().min(1).max(2000).required().messages({
      'string.min': 'Message must be at least 1 character long',
      'string.max': 'Message cannot exceed 2000 characters',
      'any.required': 'Message is required'
    }),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('high').optional(),
    expiresAt: Joi.date().iso().greater('now').optional()
  }
};

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for current user
 * @access  Private (All authenticated users)
 */
router.get(
  '/',
  validate(notificationQueryValidation),
  notificationController.getNotifications
);

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics for current user
 * @access  Private (All authenticated users)
 */
router.get(
  '/stats',
  notificationController.getNotificationStats
);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences for current user
 * @access  Private (All authenticated users)
 */
router.get(
  '/preferences',
  notificationController.getPreferences
);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences for current user
 * @access  Private (All authenticated users)
 */
router.put(
  '/preferences',
  validate(preferencesValidation),
  notificationController.updatePreferences
);

/**
 * @route   POST /api/notifications/preferences/reset
 * @desc    Reset notification preferences to default
 * @access  Private (All authenticated users)
 */
router.post(
  '/preferences/reset',
  notificationController.resetPreferences
);

/**
 * @route   GET /api/notifications/ws-stats
 * @desc    Get WebSocket connection statistics
 * @access  Private (Admin only)
 */
router.get(
  '/ws-stats',
  requireRole(['admin']),
  notificationController.getWebSocketStats
);

/**
 * @route   POST /api/notifications/cleanup
 * @desc    Clean up expired notifications
 * @access  Private (Admin only)
 */
router.post(
  '/cleanup',
  requireRole(['admin']),
  notificationController.cleanupExpiredNotifications
);

/**
 * @route   POST /api/notifications
 * @desc    Create notification for specific users
 * @access  Private (Admin and Guru only)
 */
router.post(
  '/',
  requireRole(['admin', 'guru']),
  validate(createNotificationValidation),
  notificationController.createNotification
);

/**
 * @route   POST /api/notifications/template
 * @desc    Create notification from template
 * @access  Private (Admin and Guru only)
 */
router.post(
  '/template',
  requireRole(['admin', 'guru']),
  validate(templateNotificationValidation),
  notificationController.createNotificationFromTemplate
);

/**
 * @route   POST /api/notifications/announcement
 * @desc    Send system announcement to all users
 * @access  Private (Admin only)
 */
router.post(
  '/announcement',
  requireRole(['admin']),
  validate(announcementValidation),
  notificationController.sendSystemAnnouncement
);

/**
 * @route   PATCH /api/notifications/read-multiple
 * @desc    Mark multiple notifications as read
 * @access  Private (All authenticated users)
 */
router.patch(
  '/read-multiple',
  validate(markMultipleReadValidation),
  notificationController.markMultipleAsRead
);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private (All authenticated users)
 */
router.patch(
  '/read-all',
  notificationController.markAllAsRead
);

/**
 * @route   GET /api/notifications/:id
 * @desc    Get notification by ID
 * @access  Private (All authenticated users)
 */
router.get(
  '/:id',
  validate(notificationIdValidation),
  notificationController.getNotificationById
);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (All authenticated users)
 */
router.patch(
  '/:id/read',
  validate(notificationIdValidation),
  notificationController.markAsRead
);

/**
 * @route   PATCH /api/notifications/:id/archive
 * @desc    Archive notification
 * @access  Private (All authenticated users)
 */
router.patch(
  '/:id/archive',
  validate(notificationIdValidation),
  notificationController.archiveNotification
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private (All authenticated users)
 */
router.delete(
  '/:id',
  validate(notificationIdValidation),
  notificationController.deleteNotification
);

module.exports = router;