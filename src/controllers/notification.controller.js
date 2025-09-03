const Notification = require('../models/notification.model');
const NotificationPreferences = require('../models/notificationPreferences.model');
const notificationService = require('../services/notification.service');
const { ApiError } = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { default: httpStatus } = require('http-status');
const logger = require('../utils/logger');

/**
 * Notification Controller - Handles notification-related HTTP requests
 */

/**
 * Get notifications for current user
 * GET /api/notifications?status={status}&type={type}&page={page}&limit={limit}
 */
const getNotifications = catchAsync(async (req, res) => {
  const { 
    status, 
    type, 
    page = 1, 
    limit = 20,
    includeArchived = false 
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  const notifications = await Notification.getByUserId(req.user.id, {
    status,
    type,
    limit: Math.min(parseInt(limit), 100), // Cap at 100
    offset,
    includeArchived: includeArchived === 'true'
  });

  // Get total count for pagination
  const totalCount = await Notification.getCount(req.user.id, status);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        hasNext: offset + notifications.length < totalCount,
        hasPrev: parseInt(page) > 1
      }
    }
  });
});

/**
 * Get notification by ID
 * GET /api/notifications/:id
 */
const getNotificationById = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid notification ID');
  }

  const notification = await Notification.getById(parseInt(id), req.user.id);

  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Notification retrieved successfully',
    data: notification
  });
});

/**
 * Create notification (Admin/Guru only)
 * POST /api/notifications
 */
const createNotification = catchAsync(async (req, res) => {
  // Check permissions
  if (!['admin', 'guru'].includes(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Admin or Guru role required.');
  }

  const {
    userIds,
    title,
    message,
    type = 'info',
    priority = 'medium',
    relatedType,
    relatedId,
    actionUrl,
    actionLabel,
    metadata = {},
    expiresAt
  } = req.body;

  // Validate required fields
  if (!title || !message) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Title and message are required');
  }

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'At least one user ID is required');
  }

  // Validate type and priority
  const validTypes = ['info', 'success', 'warning', 'error', 'assignment', 'course', 'system'];
  const validPriorities = ['low', 'medium', 'high', 'urgent'];

  if (!validTypes.includes(type)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid type. Must be one of: ${validTypes.join(', ')}`);
  }

  if (!validPriorities.includes(priority)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
  }

  // Create notifications for all specified users
  const createdNotifications = await Notification.bulkCreate(userIds, {
    title,
    message,
    type,
    priority,
    relatedType,
    relatedId,
    actionUrl,
    actionLabel,
    metadata,
    expiresAt
  });

  // Send WebSocket notifications
  for (const created of createdNotifications) {
    await notificationService.sendNotificationToUser(created.user_id, {
      id: created.id,
      title,
      message,
      type,
      priority,
      related_type: relatedType,
      related_id: relatedId,
      action_url: actionUrl,
      action_label: actionLabel,
      metadata,
      created_at: new Date().toISOString()
    });
  }

  res.status(httpStatus.CREATED).json({
    success: true,
    message: `Notification created for ${createdNotifications.length} users`,
    data: {
      created: createdNotifications.length,
      notifications: createdNotifications
    }
  });
});

/**
 * Create notification from template (Admin/Guru only)
 * POST /api/notifications/template
 */
const createNotificationFromTemplate = catchAsync(async (req, res) => {
  // Check permissions
  if (!['admin', 'guru'].includes(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Admin or Guru role required.');
  }

  const { templateName, userIds, variables = {} } = req.body;

  if (!templateName || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Template name and user IDs are required');
  }

  const createdNotifications = [];

  // Create notifications for each user
  for (const userId of userIds) {
    try {
      const notification = await Notification.createFromTemplate(templateName, userId, variables);
      createdNotifications.push(notification);

      // Send WebSocket notification
      await notificationService.sendNotificationToUser(userId, notification);
    } catch (error) {
      logger.error(`Failed to create notification from template for user ${userId}: ${error.message}`);
    }
  }

  res.status(httpStatus.CREATED).json({
    success: true,
    message: `Notifications created from template for ${createdNotifications.length} users`,
    data: {
      templateName,
      created: createdNotifications.length,
      notifications: createdNotifications
    }
  });
});

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid notification ID');
  }

  const updated = await Notification.markAsRead(parseInt(id), req.user.id);

  if (!updated) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found or already read');
  }

  // Update WebSocket clients
  await notificationService.sendUnreadCount(req.user.id);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Notification marked as read',
    data: updated
  });
});

/**
 * Mark multiple notifications as read
 * PATCH /api/notifications/read-multiple
 */
const markMultipleAsRead = catchAsync(async (req, res) => {
  const { notificationIds } = req.body;

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Notification IDs array is required');
  }

  const updatedIds = await Notification.markMultipleAsRead(notificationIds, req.user.id);

  // Update WebSocket clients
  await notificationService.sendUnreadCount(req.user.id);

  res.status(httpStatus.OK).json({
    success: true,
    message: `${updatedIds.length} notifications marked as read`,
    data: { updatedIds }
  });
});

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
const markAllAsRead = catchAsync(async (req, res) => {
  const count = await Notification.markAllAsRead(req.user.id);

  // Update WebSocket clients
  await notificationService.sendUnreadCount(req.user.id);

  res.status(httpStatus.OK).json({
    success: true,
    message: `${count} notifications marked as read`,
    data: { count }
  });
});

/**
 * Archive notification
 * PATCH /api/notifications/:id/archive
 */
const archiveNotification = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid notification ID');
  }

  const archived = await Notification.archive(parseInt(id), req.user.id);

  if (!archived) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  // Update WebSocket clients
  await notificationService.sendUnreadCount(req.user.id);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Notification archived',
    data: archived
  });
});

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
const deleteNotification = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid notification ID');
  }

  const deleted = await Notification.delete(parseInt(id), req.user.id);

  if (!deleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  // Update WebSocket clients
  await notificationService.sendUnreadCount(req.user.id);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Notification deleted'
  });
});

/**
 * Get notification statistics
 * GET /api/notifications/stats
 */
const getNotificationStats = catchAsync(async (req, res) => {
  const stats = await Notification.getStats(req.user.id);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Notification statistics retrieved successfully',
    data: stats
  });
});

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
const getPreferences = catchAsync(async (req, res) => {
  let preferences = await NotificationPreferences.getByUserId(req.user.id);

  // Create default preferences if not found
  if (!preferences) {
    preferences = await NotificationPreferences.createDefault(req.user.id);
  }

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Notification preferences retrieved successfully',
    data: preferences
  });
});

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
const updatePreferences = catchAsync(async (req, res) => {
  const preferences = req.body;

  // Validate preferences structure
  const validFields = [
    'email_enabled', 'email_frequency', 'push_enabled', 'push_assignments',
    'push_grades', 'push_course_updates', 'push_system_alerts', 'websocket_enabled',
    'notification_types', 'quiet_hours_enabled', 'quiet_hours_start',
    'quiet_hours_end', 'quiet_hours_timezone'
  ];

  const invalidFields = Object.keys(preferences).filter(field => !validFields.includes(field));
  if (invalidFields.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid preference fields: ${invalidFields.join(', ')}`);
  }

  // Validate email frequency
  if (preferences.email_frequency && !['immediate', 'daily', 'weekly', 'never'].includes(preferences.email_frequency)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid email frequency. Must be immediate, daily, weekly, or never');
  }

  const updated = await NotificationPreferences.update(req.user.id, preferences);

  if (!updated) {
    // Create preferences if they don't exist
    await NotificationPreferences.createDefault(req.user.id);
    const created = await NotificationPreferences.update(req.user.id, preferences);
    
    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Notification preferences created successfully',
      data: created
    });
  } else {
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: updated
    });
  }
});

/**
 * Reset preferences to default
 * POST /api/notifications/preferences/reset
 */
const resetPreferences = catchAsync(async (req, res) => {
  const reset = await NotificationPreferences.resetToDefault(req.user.id);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Notification preferences reset to default',
    data: reset
  });
});

/**
 * Send system announcement (Admin only)
 * POST /api/notifications/announcement
 */
const sendSystemAnnouncement = catchAsync(async (req, res) => {
  // Check admin permission
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Admin role required.');
  }

  const { title, message, priority = 'high', expiresAt } = req.body;

  if (!title || !message) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Title and message are required');
  }

  // Get all user IDs
  const db = require('../config/db');
  const usersResult = await db.query('SELECT id FROM users');
  const userIds = usersResult.rows.map(row => row.id);

  // Create notifications for all users
  const createdNotifications = await Notification.bulkCreate(userIds, {
    title,
    message,
    type: 'system',
    priority,
    metadata: { isAnnouncement: true },
    expiresAt
  });

  // Send WebSocket notifications
  const sentCount = await notificationService.sendSystemAnnouncement({
    title,
    message,
    priority,
    metadata: { isAnnouncement: true }
  });

  res.status(httpStatus.CREATED).json({
    success: true,
    message: `System announcement sent to ${createdNotifications.length} users`,
    data: {
      created: createdNotifications.length,
      websocketSent: sentCount
    }
  });
});

/**
 * Get WebSocket connection stats (Admin only)
 * GET /api/notifications/ws-stats
 */
const getWebSocketStats = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Admin role required.');
  }

  const stats = notificationService.getStats();

  res.status(httpStatus.OK).json({
    success: true,
    message: 'WebSocket statistics retrieved successfully',
    data: stats
  });
});

/**
 * Clean up expired notifications (Admin only)
 * POST /api/notifications/cleanup
 */
const cleanupExpiredNotifications = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Admin role required.');
  }

  const deletedCount = await Notification.cleanupExpired();

  res.status(httpStatus.OK).json({
    success: true,
    message: `Cleaned up ${deletedCount} expired notifications`,
    data: { deletedCount }
  });
});

module.exports = {
  getNotifications,
  getNotificationById,
  createNotification,
  createNotificationFromTemplate,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  getNotificationStats,
  getPreferences,
  updatePreferences,
  resetPreferences,
  sendSystemAnnouncement,
  getWebSocketStats,
  cleanupExpiredNotifications
};