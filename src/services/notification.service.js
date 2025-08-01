const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Notification = require('../models/notification.model');
const NotificationPreferences = require('../models/notificationPreferences.model');
const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * WebSocket Notification Service - Handles real-time notifications
 */
class NotificationService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map of userId -> Set of WebSocket connections
    this.isInitialized = false;
  }

  /**
   * Initialize the WebSocket server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    try {
      this.wss = new WebSocket.Server({
        server,
        path: '/api/notifications/ws',
        verifyClient: this.verifyClient.bind(this)
      });

      this.wss.on('connection', this.handleConnection.bind(this));
      this.wss.on('error', (error) => {
        logger.error(`WebSocket server error: ${error.message}`);
      });

      this.isInitialized = true;
      logger.info('WebSocket notification service initialized');

      // Set up periodic cleanup
      setInterval(() => {
        this.cleanupStaleConnections();
      }, 30000); // Every 30 seconds

    } catch (error) {
      logger.error(`Failed to initialize WebSocket server: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify client connection (authenticate JWT token)
   * @param {Object} info - Connection info
   */
  verifyClient(info) {
    try {
      const url = new URL(info.req.url, 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        logger.warn('WebSocket connection rejected: No token provided');
        return false;
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        info.req.user = decoded;
        return true;
      } catch (jwtError) {
        logger.warn(`WebSocket connection rejected: Invalid token - ${jwtError.message}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error verifying WebSocket client: ${error.message}`);
      return false;
    }
  }

  /**
   * Handle new WebSocket connection
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} req - HTTP request
   */
  handleConnection(ws, req) {
    try {
      const user = req.user;
      const userId = user.id;

      logger.info(`WebSocket connection established for user ${userId}`);

      // Add client to tracking
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);

      // Set user info on WebSocket
      ws.userId = userId;
      ws.userRole = user.role;
      ws.isAlive = true;

      // Set up ping/pong for connection health
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle incoming messages
      ws.on('message', (message) => {
        this.handleMessage(ws, message);
      });

      // Handle connection close
      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      // Handle connection error
      ws.on('error', (error) => {
        logger.error(`WebSocket error for user ${userId}: ${error.message}`);
        this.handleDisconnection(ws);
      });

      // Send initial data
      this.sendWelcomeMessage(ws, user);

      // Send unread notification count
      this.sendUnreadCount(userId);

    } catch (error) {
      logger.error(`Error handling WebSocket connection: ${error.message}`);
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} message - Message data
   */
  async handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      const { type, payload } = data;

      switch (type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        case 'mark_read':
          if (payload.notificationId) {
            await this.markNotificationAsRead(ws.userId, payload.notificationId);
          }
          break;

        case 'mark_all_read':
          await this.markAllNotificationsAsRead(ws.userId);
          break;

        case 'get_notifications':
          await this.sendRecentNotifications(ws.userId, payload.limit || 10);
          break;

        case 'subscribe':
          // Handle subscription to specific notification types
          if (payload.types) {
            ws.subscribedTypes = payload.types;
          }
          break;

        default:
          logger.warn(`Unknown WebSocket message type: ${type}`);
      }
    } catch (error) {
      logger.error(`Error handling WebSocket message: ${error.message}`);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }

  /**
   * Handle WebSocket disconnection
   * @param {WebSocket} ws - WebSocket connection
   */
  handleDisconnection(ws) {
    try {
      const userId = ws.userId;
      if (userId && this.clients.has(userId)) {
        this.clients.get(userId).delete(ws);
        
        // Remove user entry if no more connections
        if (this.clients.get(userId).size === 0) {
          this.clients.delete(userId);
        }
        
        logger.info(`WebSocket connection closed for user ${userId}`);
      }
    } catch (error) {
      logger.error(`Error handling WebSocket disconnection: ${error.message}`);
    }
  }

  /**
   * Send welcome message to new connection
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} user - User object
   */
  sendWelcomeMessage(ws, user) {
    try {
      ws.send(JSON.stringify({
        type: 'welcome',
        data: {
          message: 'WebSocket connection established',
          userId: user.id,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      logger.error(`Error sending welcome message: ${error.message}`);
    }
  }

  /**
   * Send notification to specific user
   * @param {number} userId - User ID
   * @param {Object} notification - Notification data
   */
  async sendNotificationToUser(userId, notification) {
    try {
      // Check if user should receive this notification
      const shouldReceive = await NotificationPreferences.shouldReceiveNotification(
        userId, 
        notification.type, 
        'websocket'
      );

      if (!shouldReceive) {
        logger.debug(`User ${userId} opted out of ${notification.type} notifications via WebSocket`);
        return false;
      }

      const userConnections = this.clients.get(userId);
      if (!userConnections || userConnections.size === 0) {
        logger.debug(`No active WebSocket connections for user ${userId}`);
        return false;
      }

      const message = JSON.stringify({
        type: 'notification',
        data: {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          relatedType: notification.related_type,
          relatedId: notification.related_id,
          actionUrl: notification.action_url,
          actionLabel: notification.action_label,
          metadata: notification.metadata,
          createdAt: notification.created_at,
          timestamp: new Date().toISOString()
        }
      });

      let sentCount = 0;
      userConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          // Check if connection is subscribed to this notification type
          if (!ws.subscribedTypes || ws.subscribedTypes.includes(notification.type) || ws.subscribedTypes.includes('all')) {
            ws.send(message);
            sentCount++;
          }
        }
      });

      logger.debug(`Sent notification ${notification.id} to ${sentCount} connections for user ${userId}`);
      return sentCount > 0;

    } catch (error) {
      logger.error(`Error sending notification to user ${userId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Send notification to multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {Object} notification - Notification data
   */
  async sendNotificationToUsers(userIds, notification) {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return 0;
      }

      // Filter users based on preferences
      const allowedUsers = await NotificationPreferences.filterUsersForNotification(
        userIds, 
        notification.type, 
        'websocket'
      );

      let totalSent = 0;
      for (const userId of allowedUsers) {
        const sent = await this.sendNotificationToUser(userId, notification);
        if (sent) totalSent++;
      }

      logger.info(`Sent notification ${notification.id || 'bulk'} to ${totalSent} users via WebSocket`);
      return totalSent;

    } catch (error) {
      logger.error(`Error sending notification to multiple users: ${error.message}`);
      return 0;
    }
  }

  /**
   * Broadcast notification to all connected users
   * @param {Object} notification - Notification data
   * @param {Array} excludeUsers - User IDs to exclude from broadcast
   */
  async broadcastNotification(notification, excludeUsers = []) {
    try {
      const allUserIds = Array.from(this.clients.keys()).filter(userId => 
        !excludeUsers.includes(userId)
      );

      return await this.sendNotificationToUsers(allUserIds, notification);
    } catch (error) {
      logger.error(`Error broadcasting notification: ${error.message}`);
      return 0;
    }
  }

  /**
   * Send unread notification count to user
   * @param {number} userId - User ID
   */
  async sendUnreadCount(userId) {
    try {
      const count = await Notification.getCount(userId, 'unread');
      const userConnections = this.clients.get(userId);

      if (userConnections && userConnections.size > 0) {
        const message = JSON.stringify({
          type: 'unread_count',
          data: { count, timestamp: new Date().toISOString() }
        });

        userConnections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        });
      }
    } catch (error) {
      logger.error(`Error sending unread count to user ${userId}: ${error.message}`);
    }
  }

  /**
   * Send recent notifications to user
   * @param {number} userId - User ID
   * @param {number} limit - Number of notifications to send
   */
  async sendRecentNotifications(userId, limit = 10) {
    try {
      const notifications = await Notification.getByUserId(userId, { limit });
      const userConnections = this.clients.get(userId);

      if (userConnections && userConnections.size > 0) {
        const message = JSON.stringify({
          type: 'recent_notifications',
          data: {
            notifications,
            timestamp: new Date().toISOString()
          }
        });

        userConnections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        });
      }
    } catch (error) {
      logger.error(`Error sending recent notifications to user ${userId}: ${error.message}`);
    }
  }

  /**
   * Mark notification as read and update all user connections
   * @param {number} userId - User ID
   * @param {number} notificationId - Notification ID
   */
  async markNotificationAsRead(userId, notificationId) {
    try {
      const updated = await Notification.markAsRead(notificationId, userId);
      if (updated) {
        // Send updated unread count
        await this.sendUnreadCount(userId);
        
        // Notify all connections that notification was read
        const userConnections = this.clients.get(userId);
        if (userConnections && userConnections.size > 0) {
          const message = JSON.stringify({
            type: 'notification_read',
            data: { notificationId, timestamp: new Date().toISOString() }
          });

          userConnections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(message);
            }
          });
        }
      }
    } catch (error) {
      logger.error(`Error marking notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for user
   * @param {number} userId - User ID
   */
  async markAllNotificationsAsRead(userId) {
    try {
      const count = await Notification.markAllAsRead(userId);
      if (count > 0) {
        await this.sendUnreadCount(userId);
        
        const userConnections = this.clients.get(userId);
        if (userConnections && userConnections.size > 0) {
          const message = JSON.stringify({
            type: 'all_notifications_read',
            data: { count, timestamp: new Date().toISOString() }
          });

          userConnections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(message);
            }
          });
        }
      }
    } catch (error) {
      logger.error(`Error marking all notifications as read: ${error.message}`);
    }
  }

  /**
   * Clean up stale WebSocket connections
   */
  cleanupStaleConnections() {
    try {
      let cleanedCount = 0;
      
      this.clients.forEach((connections, userId) => {
        const activeConnections = new Set();
        
        connections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            if (ws.isAlive === false) {
              ws.terminate();
              cleanedCount++;
            } else {
              ws.isAlive = false;
              ws.ping();
              activeConnections.add(ws);
            }
          } else {
            cleanedCount++;
          }
        });

        if (activeConnections.size === 0) {
          this.clients.delete(userId);
        } else {
          this.clients.set(userId, activeConnections);
        }
      });

      if (cleanedCount > 0) {
        logger.debug(`Cleaned up ${cleanedCount} stale WebSocket connections`);
      }
    } catch (error) {
      logger.error(`Error cleaning up WebSocket connections: ${error.message}`);
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const totalConnections = Array.from(this.clients.values())
      .reduce((sum, connections) => sum + connections.size, 0);

    return {
      isInitialized: this.isInitialized,
      connectedUsers: this.clients.size,
      totalConnections,
      averageConnectionsPerUser: this.clients.size > 0 ? totalConnections / this.clients.size : 0
    };
  }

  /**
   * Send system announcement to all users
   * @param {Object} announcement - Announcement data
   */
  async sendSystemAnnouncement(announcement) {
    try {
      return await this.broadcastNotification({
        ...announcement,
        type: 'system',
        priority: announcement.priority || 'high'
      });
    } catch (error) {
      logger.error(`Error sending system announcement: ${error.message}`);
      return 0;
    }
  }

  /**
   * Close all connections (for graceful shutdown)
   */
  shutdown() {
    try {
      if (this.wss) {
        this.wss.close();
        logger.info('WebSocket notification service shut down');
      }
    } catch (error) {
      logger.error(`Error shutting down WebSocket service: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new NotificationService();