const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Notification Model - Handles notification data operations
 */
class Notification {

  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   */
  static async create(notificationData) {
    try {
      const {
        userId,
        title,
        message,
        type = 'info',
        priority = 'medium',
        relatedType = null,
        relatedId = null,
        actionUrl = null,
        actionLabel = null,
        metadata = {},
        expiresAt = null
      } = notificationData;

      const query = `
        INSERT INTO notifications (
          user_id, title, message, type, priority, 
          related_type, related_id, action_url, action_label, 
          metadata, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        userId, title, message, type, priority,
        relatedType, relatedId, actionUrl, actionLabel,
        JSON.stringify(metadata), expiresAt
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create notification from template
   * @param {string} templateName - Template name
   * @param {number} userId - User ID
   * @param {Object} variables - Template variables
   */
  static async createFromTemplate(templateName, userId, variables = {}) {
    try {
      // Get template
      const templateQuery = `
        SELECT * FROM notification_templates 
        WHERE name = $1 AND is_active = true
      `;
      const templateResult = await db.query(templateQuery, [templateName]);
      
      if (templateResult.rows.length === 0) {
        throw new Error(`Notification template '${templateName}' not found`);
      }

      const template = templateResult.rows[0];

      // Replace variables in title and message
      let title = template.title_template;
      let message = template.message_template;
      let actionUrl = template.default_action_url;

      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, 'g'), variables[key]);
        message = message.replace(new RegExp(placeholder, 'g'), variables[key]);
        if (actionUrl) {
          actionUrl = actionUrl.replace(new RegExp(placeholder, 'g'), variables[key]);
        }
      });

      // Calculate expiration date
      const expiresAt = template.default_expires_hours 
        ? new Date(Date.now() + template.default_expires_hours * 60 * 60 * 1000)
        : null;

      // Create notification
      return await this.create({
        userId,
        title,
        message,
        type: template.type,
        priority: template.priority,
        actionUrl,
        actionLabel: template.default_action_label,
        metadata: variables,
        expiresAt
      });
    } catch (error) {
      logger.error(`Failed to create notification from template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   */
  static async getByUserId(userId, options = {}) {
    try {
      const {
        status = null,
        type = null,
        limit = 50,
        offset = 0,
        includeArchived = false
      } = options;

      let query = `
        SELECT n.*, 
               CASE 
                 WHEN n.related_type = 'course' THEN c.name
                 WHEN n.related_type = 'assignment' THEN a.title
                 ELSE null
               END as related_name
        FROM notifications n
        LEFT JOIN courses c ON n.related_type = 'course' AND n.related_id = c.id
        LEFT JOIN assignments a ON n.related_type = 'assignment' AND n.related_id = a.id
        WHERE n.user_id = $1
      `;

      const params = [userId];
      let paramCount = 1;

      if (!includeArchived) {
        query += ` AND n.status != 'archived'`;
      }

      if (status) {
        query += ` AND n.status = $${++paramCount}`;
        params.push(status);
      }

      if (type) {
        query += ` AND n.type = $${++paramCount}`;
        params.push(type);
      }

      // Filter out expired notifications
      query += ` AND (n.expires_at IS NULL OR n.expires_at > NOW())`;

      query += ` ORDER BY n.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error(`Failed to get notifications for user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notification by ID
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID (for security check)
   */
  static async getById(notificationId, userId = null) {
    try {
      let query = `
        SELECT n.*, 
               CASE 
                 WHEN n.related_type = 'course' THEN c.name
                 WHEN n.related_type = 'assignment' THEN a.title
                 ELSE null
               END as related_name
        FROM notifications n
        LEFT JOIN courses c ON n.related_type = 'course' AND n.related_id = c.id
        LEFT JOIN assignments a ON n.related_type = 'assignment' AND n.related_id = a.id
        WHERE n.id = $1
      `;

      const params = [notificationId];

      if (userId) {
        query += ` AND n.user_id = $2`;
        params.push(userId);
      }

      const result = await db.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to get notification by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID (for security check)
   */
  static async markAsRead(notificationId, userId) {
    try {
      const query = `
        UPDATE notifications 
        SET status = 'read', read_at = NOW() 
        WHERE id = $1 AND user_id = $2 AND status = 'unread'
        RETURNING *
      `;

      const result = await db.query(query, [notificationId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to mark notification as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   * @param {Array} notificationIds - Array of notification IDs
   * @param {number} userId - User ID
   */
  static async markMultipleAsRead(notificationIds, userId) {
    try {
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return [];
      }

      const placeholders = notificationIds.map((_, index) => `$${index + 2}`).join(',');
      const query = `
        UPDATE notifications 
        SET status = 'read', read_at = NOW() 
        WHERE user_id = $1 AND id IN (${placeholders}) AND status = 'unread'
        RETURNING id
      `;

      const params = [userId, ...notificationIds];
      const result = await db.query(query, params);
      return result.rows.map(row => row.id);
    } catch (error) {
      logger.error(`Failed to mark multiple notifications as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {number} userId - User ID
   */
  static async markAllAsRead(userId) {
    try {
      const query = `
        UPDATE notifications 
        SET status = 'read', read_at = NOW() 
        WHERE user_id = $1 AND status = 'unread'
        RETURNING id
      `;

      const result = await db.query(query, [userId]);
      return result.rows.length;
    } catch (error) {
      logger.error(`Failed to mark all notifications as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Archive notification
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID
   */
  static async archive(notificationId, userId) {
    try {
      const query = `
        UPDATE notifications 
        SET status = 'archived', archived_at = NOW() 
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await db.query(query, [notificationId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to archive notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete notification
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID
   */
  static async delete(notificationId, userId) {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await db.query(query, [notificationId, userId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Failed to delete notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notification count for a user
   * @param {number} userId - User ID
   * @param {string} status - Status filter ('unread', 'read', 'archived')
   */
  static async getCount(userId, status = null) {
    try {
      let query = `
        SELECT COUNT(*) as count
        FROM notifications 
        WHERE user_id = $1 
          AND (expires_at IS NULL OR expires_at > NOW())
      `;

      const params = [userId];

      if (status) {
        query += ` AND status = $2`;
        params.push(status);
      }

      const result = await db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error(`Failed to get notification count: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   * @param {number} userId - User ID
   */
  static async getStats(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'unread' THEN 1 END) as unread,
          COUNT(CASE WHEN status = 'read' THEN 1 END) as read,
          COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived,
          COUNT(CASE WHEN type = 'assignment' THEN 1 END) as assignments,
          COUNT(CASE WHEN type = 'course' THEN 1 END) as courses,
          COUNT(CASE WHEN type = 'system' THEN 1 END) as system,
          COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high
        FROM notifications 
        WHERE user_id = $1 
          AND (expires_at IS NULL OR expires_at > NOW())
      `;

      const result = await db.query(query, [userId]);
      const stats = result.rows[0];

      // Convert string counts to numbers
      Object.keys(stats).forEach(key => {
        stats[key] = parseInt(stats[key]);
      });

      return stats;
    } catch (error) {
      logger.error(`Failed to get notification stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpired() {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE expires_at IS NOT NULL AND expires_at < NOW()
        RETURNING id
      `;

      const result = await db.query(query);
      const deletedCount = result.rows.length;
      
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired notifications`);
      }

      return deletedCount;
    } catch (error) {
      logger.error(`Failed to cleanup expired notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk create notifications for multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {Object} notificationData - Notification data (same for all users)
   */
  static async bulkCreate(userIds, notificationData) {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return [];
      }

      const {
        title,
        message,
        type = 'info',
        priority = 'medium',
        relatedType = null,
        relatedId = null,
        actionUrl = null,
        actionLabel = null,
        metadata = {},
        expiresAt = null
      } = notificationData;

      const values = userIds.map((userId, index) => {
        const offset = index * 11;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
      }).join(', ');

      const query = `
        INSERT INTO notifications (
          user_id, title, message, type, priority,
          related_type, related_id, action_url, action_label,
          metadata, expires_at
        )
        VALUES ${values}
        RETURNING id, user_id
      `;

      const params = [];
      userIds.forEach(userId => {
        params.push(
          userId, title, message, type, priority,
          relatedType, relatedId, actionUrl, actionLabel,
          JSON.stringify(metadata), expiresAt
        );
      });

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error(`Failed to bulk create notifications: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Notification;