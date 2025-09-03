const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * NotificationPreferences Model - Handles user notification preferences
 */
class NotificationPreferences {

  /**
   * Get notification preferences for a user
   * @param {number} userId - User ID
   */
  static async getByUserId(userId) {
    try {
      const query = `
        SELECT * FROM notification_preferences 
        WHERE user_id = $1
      `;

      const result = await db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to get notification preferences: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create default notification preferences for a user
   * @param {number} userId - User ID
   */
  static async createDefault(userId) {
    try {
      const query = `
        INSERT INTO notification_preferences (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
        RETURNING *
      `;

      const result = await db.query(query, [userId]);
      return result.rows[0] || await this.getByUserId(userId);
    } catch (error) {
      logger.error(`Failed to create default notification preferences: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update notification preferences for a user
   * @param {number} userId - User ID
   * @param {Object} preferences - Preference updates
   */
  static async update(userId, preferences) {
    try {
      const allowedFields = [
        'email_enabled', 'email_frequency', 'push_enabled', 'push_assignments',
        'push_grades', 'push_course_updates', 'push_system_alerts', 'websocket_enabled',
        'notification_types', 'quiet_hours_enabled', 'quiet_hours_start',
        'quiet_hours_end', 'quiet_hours_timezone'
      ];

      const updates = [];
      const values = [userId];
      let paramCount = 1;

      Object.keys(preferences).forEach(key => {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = $${++paramCount}`);
          values.push(preferences[key]);
        }
      });

      if (updates.length === 0) {
        throw new Error('No valid preference fields provided');
      }

      const query = `
        UPDATE notification_preferences 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE user_id = $1
        RETURNING *
      `;

      const result = await db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to update notification preferences: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if user should receive notification based on preferences
   * @param {number} userId - User ID
   * @param {string} notificationType - Type of notification
   * @param {string} deliveryMethod - Delivery method ('websocket', 'email', 'push')
   */
  static async shouldReceiveNotification(userId, notificationType, deliveryMethod = 'websocket') {
    try {
      const preferences = await this.getByUserId(userId);
      
      if (!preferences) {
        // Create default preferences if not found
        await this.createDefault(userId);
        return true; // Default to allowing notifications
      }

      // Check if delivery method is enabled
      switch (deliveryMethod) {
        case 'email':
          if (!preferences.email_enabled) return false;
          break;
        case 'push':
          if (!preferences.push_enabled) return false;
          break;
        case 'websocket':
          if (!preferences.websocket_enabled) return false;
          break;
      }

      // Check type-specific preferences for push notifications
      if (deliveryMethod === 'push') {
        switch (notificationType) {
          case 'assignment':
            if (!preferences.push_assignments) return false;
            break;
          case 'grade':
            if (!preferences.push_grades) return false;
            break;
          case 'course':
            if (!preferences.push_course_updates) return false;
            break;
          case 'system':
            if (!preferences.push_system_alerts) return false;
            break;
        }
      }

      // Check notification_types JSON preferences
      if (preferences.notification_types && typeof preferences.notification_types === 'object') {
        const typePreference = preferences.notification_types[notificationType];
        if (typePreference === false) return false;
      }

      // Check quiet hours
      if (preferences.quiet_hours_enabled && this.isInQuietHours(preferences)) {
        // Only allow urgent notifications during quiet hours
        return false; // We would need priority info to make this decision
      }

      return true;
    } catch (error) {
      logger.error(`Failed to check notification preferences: ${error.message}`);
      return true; // Default to allowing notifications on error
    }
  }

  /**
   * Check if current time is within user's quiet hours
   * @param {Object} preferences - User preferences
   */
  static isInQuietHours(preferences) {
    try {
      if (!preferences.quiet_hours_enabled) return false;

      const now = new Date();
      const startTime = preferences.quiet_hours_start;
      const endTime = preferences.quiet_hours_end;

      if (!startTime || !endTime) return false;

      // Create date objects for comparison
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      const [startHour, startMinute] = startTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;

      const [endHour, endMinute] = endTime.split(':').map(Number);
      const endMinutes = endHour * 60 + endMinute;

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startMinutes > endMinutes) {
        return currentTime >= startMinutes || currentTime <= endMinutes;
      } else {
        return currentTime >= startMinutes && currentTime <= endMinutes;
      }
    } catch (error) {
      logger.error(`Failed to check quiet hours: ${error.message}`);
      return false;
    }
  }

  /**
   * Get users who should receive a specific type of notification
   * @param {Array} userIds - Array of user IDs to check
   * @param {string} notificationType - Type of notification
   * @param {string} deliveryMethod - Delivery method
   */
  static async filterUsersForNotification(userIds, notificationType, deliveryMethod = 'websocket') {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return [];
      }

      const allowedUsers = [];
      
      for (const userId of userIds) {
        const shouldReceive = await this.shouldReceiveNotification(userId, notificationType, deliveryMethod);
        if (shouldReceive) {
          allowedUsers.push(userId);
        }
      }

      return allowedUsers;
    } catch (error) {
      logger.error(`Failed to filter users for notification: ${error.message}`);
      return userIds; // Return all users on error
    }
  }

  /**
   * Get email frequency setting for a user
   * @param {number} userId - User ID
   */
  static async getEmailFrequency(userId) {
    try {
      const preferences = await this.getByUserId(userId);
      return preferences?.email_frequency || 'immediate';
    } catch (error) {
      logger.error(`Failed to get email frequency: ${error.message}`);
      return 'immediate';
    }
  }

  /**
   * Bulk update notification preferences for multiple users
   * @param {Array} updates - Array of {userId, preferences} objects
   */
  static async bulkUpdate(updates) {
    try {
      const results = [];
      
      for (const update of updates) {
        const result = await this.update(update.userId, update.preferences);
        results.push(result);
      }

      return results;
    } catch (error) {
      logger.error(`Failed to bulk update notification preferences: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reset preferences to default for a user
   * @param {number} userId - User ID
   */
  static async resetToDefault(userId) {
    try {
      const query = `
        UPDATE notification_preferences 
        SET 
          email_enabled = true,
          email_frequency = 'immediate',
          push_enabled = true,
          push_assignments = true,
          push_grades = true,
          push_course_updates = true,
          push_system_alerts = true,
          websocket_enabled = true,
          notification_types = '{}',
          quiet_hours_enabled = false,
          quiet_hours_start = null,
          quiet_hours_end = null,
          quiet_hours_timezone = 'UTC',
          updated_at = NOW()
        WHERE user_id = $1
        RETURNING *
      `;

      const result = await db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to reset notification preferences: ${error.message}`);
      throw error;
    }
  }
}

module.exports = NotificationPreferences;