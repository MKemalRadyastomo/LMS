const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * User Statistics Model - Handles user activity tracking and progress metrics
 */
class UserStats {

  /**
   * Get user statistics
   * @param {number} userId - User ID
   */
  static async getUserStatistics(userId) {
    try {
      const query = `
        SELECT 
          us.*,
          u.name,
          u.email,
          u.role,
          u.created_at as user_created_at
        FROM user_statistics us
        JOIN users u ON us.user_id = u.id
        WHERE us.user_id = $1
      `;

      const result = await db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to get user statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user statistics
   * @param {number} userId - User ID
   * @param {Object} stats - Statistics to update
   */
  static async updateUserStatistics(userId, stats = {}) {
    try {
      // Calculate current statistics if not provided
      const calculatedStats = await this.calculateUserStatistics(userId);
      const finalStats = { ...calculatedStats, ...stats };

      const query = `
        INSERT INTO user_statistics (
          user_id, 
          courses_enrolled, 
          assignments_completed, 
          average_grade, 
          total_study_time, 
          last_activity, 
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          courses_enrolled = EXCLUDED.courses_enrolled,
          assignments_completed = EXCLUDED.assignments_completed,
          average_grade = EXCLUDED.average_grade,
          total_study_time = EXCLUDED.total_study_time,
          last_activity = EXCLUDED.last_activity,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `;

      const values = [
        userId,
        finalStats.courses_enrolled || 0,
        finalStats.assignments_completed || 0,
        finalStats.average_grade || 0,
        finalStats.total_study_time || 0,
        finalStats.last_activity || new Date()
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error(`Failed to update user statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate user statistics from actual data
   * @param {number} userId - User ID
   */
  static async calculateUserStatistics(userId) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT ce.course_id) as courses_enrolled,
          COUNT(s.id) as assignments_completed,
          ROUND(AVG(s.grade), 2) as average_grade,
          COALESCE(MAX(s.created_at), MAX(ce.created_at), NOW()) as last_activity
        FROM users u
        LEFT JOIN course_enrollments ce ON u.id = ce.user_id AND ce.status = 'active'
        LEFT JOIN assignment_submissions s ON u.id = s.student_id
        WHERE u.id = $1
        GROUP BY u.id
      `;

      const result = await db.query(statsQuery, [userId]);
      return result.rows[0] || {
        courses_enrolled: 0,
        assignments_completed: 0,
        average_grade: 0,
        last_activity: new Date()
      };
    } catch (error) {
      logger.error(`Failed to calculate user statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user progress in specific course
   * @param {number} userId - User ID
   * @param {number} courseId - Course ID
   */
  static async getUserCourseProgress(userId, courseId) {
    try {
      const query = `
        SELECT 
          c.id as course_id,
          c.name as course_name,
          c.description,
          u_teacher.name as teacher_name,
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT s.id) as completed_assignments,
          COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_assignments,
          ROUND(AVG(s.grade), 2) as average_grade,
          MAX(s.created_at) as last_submission,
          ce.enrollment_date,
          ce.status as enrollment_status,
          COUNT(DISTINCT m.id) as total_materials
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        JOIN users u_teacher ON c.teacher_id = u_teacher.id
        LEFT JOIN assignments a ON c.id = a.course_id AND a.status = 'active'
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = ce.user_id
        LEFT JOIN materials m ON c.id = m.course_id
        WHERE ce.user_id = $1 AND ce.course_id = $2
        GROUP BY c.id, c.name, c.description, u_teacher.name, ce.enrollment_date, ce.status
      `;

      const result = await db.query(query, [userId, courseId]);
      const progress = result.rows[0];

      if (!progress) {
        return null;
      }

      // Calculate completion percentage
      const completionPercentage = progress.total_assignments > 0 
        ? (progress.completed_assignments / progress.total_assignments) * 100 
        : 0;

      return {
        ...progress,
        completion_percentage: Math.round(completionPercentage * 100) / 100,
        progress_status: this.getProgressStatus(completionPercentage, progress.average_grade)
      };
    } catch (error) {
      logger.error(`Failed to get user course progress: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user learning streak
   * @param {number} userId - User ID
   */
  static async getUserLearningStreak(userId) {
    try {
      const query = `
        WITH daily_activity AS (
          SELECT DISTINCT DATE(created_at) as activity_date
          FROM (
            SELECT created_at FROM assignment_submissions WHERE student_id = $1
            UNION
            SELECT created_at FROM activity_logs WHERE user_id = $1 AND activity_type IN ('course_access', 'material_view')
          ) as activities
          ORDER BY activity_date DESC
        ),
        streak_calculation AS (
          SELECT 
            activity_date,
            activity_date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY activity_date DESC) as streak_group
          FROM daily_activity
        )
        SELECT 
          COUNT(*) as current_streak,
          MIN(activity_date) as streak_start,
          MAX(activity_date) as streak_end
        FROM streak_calculation
        WHERE streak_group = (
          SELECT streak_group FROM streak_calculation 
          WHERE activity_date = CURRENT_DATE 
          OR activity_date = CURRENT_DATE - INTERVAL '1 day'
          LIMIT 1
        )
      `;

      const result = await db.query(query, [userId]);
      const streak = result.rows[0];

      // Get longest streak
      const longestStreakQuery = `
        WITH daily_activity AS (
          SELECT DISTINCT DATE(created_at) as activity_date
          FROM (
            SELECT created_at FROM assignment_submissions WHERE student_id = $1
            UNION
            SELECT created_at FROM activity_logs WHERE user_id = $1 AND activity_type IN ('course_access', 'material_view')
          ) as activities
          ORDER BY activity_date
        ),
        streak_groups AS (
          SELECT 
            activity_date,
            activity_date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY activity_date) as streak_group
          FROM daily_activity
        ),
        streak_lengths AS (
          SELECT COUNT(*) as streak_length
          FROM streak_groups
          GROUP BY streak_group
        )
        SELECT MAX(streak_length) as longest_streak
        FROM streak_lengths
      `;

      const longestResult = await db.query(longestStreakQuery, [userId]);
      const longestStreak = longestResult.rows[0]?.longest_streak || 0;

      return {
        current_streak: parseInt(streak?.current_streak) || 0,
        longest_streak: parseInt(longestStreak),
        streak_start: streak?.streak_start,
        streak_end: streak?.streak_end
      };
    } catch (error) {
      logger.error(`Failed to get user learning streak: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user achievement badges
   * @param {number} userId - User ID
   */
  static async getUserAchievements(userId) {
    try {
      const stats = await this.getUserStatistics(userId);
      if (!stats) {
        return [];
      }

      const achievements = [];

      // Course completion achievements
      if (stats.courses_enrolled >= 1) {
        achievements.push({
          id: 'first_course',
          name: 'First Steps',
          description: 'Enrolled in your first course',
          icon: '🎯',
          earned_date: stats.user_created_at,
          category: 'enrollment'
        });
      }

      if (stats.courses_enrolled >= 5) {
        achievements.push({
          id: 'course_explorer',
          name: 'Course Explorer',
          description: 'Enrolled in 5 or more courses',
          icon: '🗺️',
          earned_date: stats.updated_at,
          category: 'enrollment'
        });
      }

      // Assignment completion achievements
      if (stats.assignments_completed >= 1) {
        achievements.push({
          id: 'first_submission',
          name: 'Getting Started',
          description: 'Submitted your first assignment',
          icon: '📝',
          earned_date: stats.last_activity,
          category: 'submission'
        });
      }

      if (stats.assignments_completed >= 10) {
        achievements.push({
          id: 'assignment_pro',
          name: 'Assignment Pro',
          description: 'Completed 10 assignments',
          icon: '📚',
          earned_date: stats.updated_at,
          category: 'submission'
        });
      }

      if (stats.assignments_completed >= 50) {
        achievements.push({
          id: 'super_student',
          name: 'Super Student',
          description: 'Completed 50 assignments',
          icon: '⭐',
          earned_date: stats.updated_at,
          category: 'submission'
        });
      }

      // Grade-based achievements
      if (stats.average_grade >= 90) {
        achievements.push({
          id: 'excellence',
          name: 'Excellence',
          description: 'Maintained 90%+ average grade',
          icon: '🏆',
          earned_date: stats.updated_at,
          category: 'performance'
        });
      }

      if (stats.average_grade >= 80) {
        achievements.push({
          id: 'high_achiever',
          name: 'High Achiever',
          description: 'Maintained 80%+ average grade',
          icon: '🎖️',
          earned_date: stats.updated_at,
          category: 'performance'
        });
      }

      // Learning streak achievements
      const streak = await this.getUserLearningStreak(userId);
      if (streak.longest_streak >= 7) {
        achievements.push({
          id: 'week_warrior',
          name: 'Week Warrior',
          description: 'Maintained a 7-day learning streak',
          icon: '🔥',
          earned_date: streak.streak_end,
          category: 'consistency'
        });
      }

      if (streak.longest_streak >= 30) {
        achievements.push({
          id: 'month_master',
          name: 'Month Master',
          description: 'Maintained a 30-day learning streak',
          icon: '💎',
          earned_date: streak.streak_end,
          category: 'consistency'
        });
      }

      return achievements;
    } catch (error) {
      logger.error(`Failed to get user achievements: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log user activity
   * @param {number} userId - User ID
   * @param {string} activityType - Type of activity
   * @param {string} resourceType - Type of resource accessed
   * @param {number} resourceId - ID of resource accessed
   * @param {Object} details - Additional activity details
   */
  static async logUserActivity(userId, activityType, resourceType = null, resourceId = null, details = {}) {
    try {
      const query = `
        INSERT INTO activity_logs (
          user_id, 
          activity_type, 
          resource_type, 
          resource_id, 
          details, 
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;

      const values = [
        userId,
        activityType,
        resourceType,
        resourceId,
        JSON.stringify(details)
      ];

      const result = await db.query(query, values);
      
      // Update user statistics after logging activity
      await this.updateUserStatistics(userId);
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Failed to log user activity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user activity history
   * @param {number} userId - User ID
   * @param {Object} filters - Activity filters
   */
  static async getUserActivityHistory(userId, filters = {}) {
    try {
      const { 
        activityType, 
        resourceType, 
        startDate, 
        endDate, 
        limit = 50, 
        offset = 0 
      } = filters;

      let query = `
        SELECT 
          al.*,
          CASE 
            WHEN al.resource_type = 'course' THEN c.name
            WHEN al.resource_type = 'assignment' THEN a.title
            WHEN al.resource_type = 'material' THEN m.title
            ELSE NULL
          END as resource_name
        FROM activity_logs al
        LEFT JOIN courses c ON al.resource_type = 'course' AND al.resource_id = c.id
        LEFT JOIN assignments a ON al.resource_type = 'assignment' AND al.resource_id = a.id
        LEFT JOIN materials m ON al.resource_type = 'material' AND al.resource_id = m.id
        WHERE al.user_id = $1
      `;

      const params = [userId];
      let paramCount = 1;

      if (activityType) {
        query += ` AND al.activity_type = $${++paramCount}`;
        params.push(activityType);
      }

      if (resourceType) {
        query += ` AND al.resource_type = $${++paramCount}`;
        params.push(resourceType);
      }

      if (startDate) {
        query += ` AND al.created_at >= $${++paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND al.created_at <= $${++paramCount}`;
        params.push(endDate);
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error(`Failed to get user activity history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get progress status based on completion and grade
   */
  static getProgressStatus(completionPercentage, averageGrade) {
    if (completionPercentage === 100) {
      if (averageGrade >= 90) return 'excellent';
      if (averageGrade >= 80) return 'good';
      if (averageGrade >= 70) return 'satisfactory';
      return 'completed';
    }
    
    if (completionPercentage >= 80) return 'nearly_complete';
    if (completionPercentage >= 50) return 'in_progress';
    if (completionPercentage > 0) return 'started';
    
    return 'not_started';
  }

  /**
   * Get user leaderboard position
   * @param {number} userId - User ID
   * @param {string} metric - Metric to rank by ('grade', 'assignments', 'courses')
   */
  static async getUserLeaderboardPosition(userId, metric = 'grade') {
    try {
      let orderColumn;
      switch (metric) {
        case 'grade':
          orderColumn = 'average_grade';
          break;
        case 'assignments':
          orderColumn = 'assignments_completed';
          break;
        case 'courses':
          orderColumn = 'courses_enrolled';
          break;
        default:
          orderColumn = 'average_grade';
      }

      const query = `
        WITH ranked_users AS (
          SELECT 
            us.user_id,
            us.${orderColumn},
            ROW_NUMBER() OVER (ORDER BY us.${orderColumn} DESC, us.updated_at ASC) as rank,
            COUNT(*) OVER () as total_users
          FROM user_statistics us
          JOIN users u ON us.user_id = u.id
          WHERE u.role = 'siswa' AND us.${orderColumn} > 0
        )
        SELECT 
          rank,
          total_users,
          ${orderColumn} as value,
          ROUND((rank::float / total_users) * 100, 1) as percentile
        FROM ranked_users
        WHERE user_id = $1
      `;

      const result = await db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to get user leaderboard position: ${error.message}`);
      throw error;
    }
  }
}

module.exports = UserStats;