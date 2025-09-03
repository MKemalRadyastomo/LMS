const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Analytics Model - Handles data aggregation and analytics calculations
 */
class Analytics {

  /**
   * Get dashboard analytics for different user roles
   * @param {Object} user - Current user object
   * @param {string} timeframe - Time frame for analytics ('day', 'week', 'month', 'year')
   */
  static async getDashboardAnalytics(user, timeframe = 'month') {
    try {
      const timeCondition = this.getTimeCondition(timeframe);

      switch (user.role) {
        case 'admin':
          return await this.getAdminAnalytics(timeCondition);
        case 'guru':
          return await this.getTeacherAnalytics(user.id, timeCondition);
        case 'siswa':
          return await this.getStudentAnalytics(user.id, timeCondition);
        default:
          throw new Error('Invalid user role');
      }
    } catch (error) {
      logger.error(`Failed to get dashboard analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get admin analytics (system-wide)
   */
  static async getAdminAnalytics(timeCondition) {
    try {
      // Get basic counts
      const overviewQuery = `
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE role = 'guru') as total_teachers,
          (SELECT COUNT(*) FROM users WHERE role = 'siswa') as total_students,
          (SELECT COUNT(*) FROM courses) as total_courses,
          (SELECT COUNT(*) FROM assignments) as total_assignments,
          (SELECT COUNT(*) FROM materials) as total_materials,
          (SELECT COUNT(*) FROM assignment_submissions) as total_submissions
      `;

      // Get activity stats
      const activityQuery = `
        SELECT 
          COUNT(*) as new_users,
          (SELECT COUNT(*) FROM courses WHERE ${timeCondition}) as new_courses,
          (SELECT COUNT(*) FROM assignments WHERE ${timeCondition}) as new_assignments,
          (SELECT COUNT(*) FROM assignment_submissions WHERE ${timeCondition}) as new_submissions
        FROM users 
        WHERE ${timeCondition}
      `;

      // Get grade distribution
      const gradeDistributionQuery = `
        SELECT 
          COUNT(CASE WHEN grade >= 90 THEN 1 END) as a_grades,
          COUNT(CASE WHEN grade >= 80 AND grade < 90 THEN 1 END) as b_grades,
          COUNT(CASE WHEN grade >= 70 AND grade < 80 THEN 1 END) as c_grades,
          COUNT(CASE WHEN grade >= 60 AND grade < 70 THEN 1 END) as d_grades,
          COUNT(CASE WHEN grade < 60 THEN 1 END) as f_grades,
          ROUND(AVG(grade), 2) as average_grade
        FROM assignment_submissions 
        WHERE grade IS NOT NULL AND ${timeCondition}
      `;

      // Get popular courses
      const popularCoursesQuery = `
        SELECT 
          c.id,
          c.name,
          COUNT(ce.id) as enrollment_count,
          u.name as teacher_name
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
        LEFT JOIN users u ON c.teacher_id = u.id
        GROUP BY c.id, c.name, u.name
        ORDER BY enrollment_count DESC
        LIMIT 10
      `;

      const [overview, activity, gradeDistribution, popularCourses] = await Promise.all([
        db.query(overviewQuery),
        db.query(activityQuery),
        db.query(gradeDistributionQuery),
        db.query(popularCoursesQuery)
      ]);

      return {
        overview: overview.rows[0],
        activity: activity.rows[0],
        gradeDistribution: gradeDistribution.rows[0],
        popularCourses: popularCourses.rows,
        role: 'admin',
        timeframe
      };
    } catch (error) {
      logger.error(`Failed to get admin analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get teacher analytics
   */
  static async getTeacherAnalytics(teacherId, timeCondition) {
    try {
      // Get teacher's course overview
      const overviewQuery = `
        SELECT 
          COUNT(c.id) as total_courses,
          COUNT(DISTINCT ce.user_id) as total_students,
          COUNT(a.id) as total_assignments,
          COUNT(m.id) as total_materials,
          COUNT(s.id) as total_submissions
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
        LEFT JOIN assignments a ON c.id = a.course_id
        LEFT JOIN materials m ON c.id = m.course_id
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
        WHERE c.teacher_id = $1
      `;

      // Get recent activity
      const recentActivityQuery = `
        SELECT 
          COUNT(CASE WHEN c.${timeCondition} THEN 1 END) as new_courses,
          COUNT(CASE WHEN a.${timeCondition} THEN 1 END) as new_assignments,
          COUNT(CASE WHEN s.${timeCondition} THEN 1 END) as new_submissions
        FROM courses c
        LEFT JOIN assignments a ON c.id = a.course_id
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
        WHERE c.teacher_id = $1
      `;

      // Get grade statistics for teacher's courses
      const gradeStatsQuery = `
        SELECT 
          COUNT(*) as total_graded,
          ROUND(AVG(s.grade), 2) as average_grade,
          COUNT(CASE WHEN s.grade >= 90 THEN 1 END) as a_grades,
          COUNT(CASE WHEN s.grade >= 80 AND s.grade < 90 THEN 1 END) as b_grades,
          COUNT(CASE WHEN s.grade >= 70 AND s.grade < 80 THEN 1 END) as c_grades,
          COUNT(CASE WHEN s.grade >= 60 AND s.grade < 70 THEN 1 END) as d_grades,
          COUNT(CASE WHEN s.grade < 60 THEN 1 END) as f_grades
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE c.teacher_id = $1 AND s.grade IS NOT NULL
      `;

      // Get course performance
      const coursePerformanceQuery = `
        SELECT 
          c.id,
          c.name,
          COUNT(DISTINCT ce.user_id) as student_count,
          COUNT(a.id) as assignment_count,
          COUNT(s.id) as submission_count,
          ROUND(AVG(s.grade), 2) as average_grade
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
        LEFT JOIN assignments a ON c.id = a.course_id
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
        WHERE c.teacher_id = $1
        GROUP BY c.id, c.name
        ORDER BY student_count DESC
      `;

      const [overview, activity, gradeStats, coursePerformance] = await Promise.all([
        db.query(overviewQuery, [teacherId]),
        db.query(recentActivityQuery, [teacherId]),
        db.query(gradeStatsQuery, [teacherId]),
        db.query(coursePerformanceQuery, [teacherId])
      ]);

      return {
        overview: overview.rows[0],
        activity: activity.rows[0],
        gradeStats: gradeStats.rows[0],
        coursePerformance: coursePerformance.rows,
        role: 'guru',
        timeframe
      };
    } catch (error) {
      logger.error(`Failed to get teacher analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get student analytics
   */
  static async getStudentAnalytics(studentId, timeCondition) {
    try {
      // Get student's enrollment overview
      const overviewQuery = `
        SELECT 
          COUNT(DISTINCT ce.course_id) as enrolled_courses,
          COUNT(a.id) as available_assignments,
          COUNT(s.id) as submitted_assignments,
          COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_assignments,
          ROUND(AVG(s.grade), 2) as average_grade
        FROM course_enrollments ce
        LEFT JOIN assignments a ON ce.course_id = a.course_id AND a.status = 'active'
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = $1
        WHERE ce.user_id = $1 AND ce.status = 'active'
      `;

      // Get recent activity
      const recentActivityQuery = `
        SELECT 
          COUNT(CASE WHEN ce.${timeCondition} THEN 1 END) as new_enrollments,
          COUNT(CASE WHEN s.${timeCondition} THEN 1 END) as new_submissions
        FROM course_enrollments ce
        LEFT JOIN assignment_submissions s ON s.student_id = $1
        WHERE ce.user_id = $1
      `;

      // Get grade distribution for student
      const gradeDistributionQuery = `
        SELECT 
          COUNT(CASE WHEN s.grade >= 90 THEN 1 END) as a_grades,
          COUNT(CASE WHEN s.grade >= 80 AND s.grade < 90 THEN 1 END) as b_grades,
          COUNT(CASE WHEN s.grade >= 70 AND s.grade < 80 THEN 1 END) as c_grades,
          COUNT(CASE WHEN s.grade >= 60 AND s.grade < 70 THEN 1 END) as d_grades,
          COUNT(CASE WHEN s.grade < 60 THEN 1 END) as f_grades
        FROM assignment_submissions s
        WHERE s.student_id = $1 AND s.grade IS NOT NULL
      `;

      // Get course progress
      const courseProgressQuery = `
        SELECT 
          c.id,
          c.name,
          u.name as teacher_name,
          COUNT(a.id) as total_assignments,
          COUNT(s.id) as submitted_assignments,
          COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_assignments,
          ROUND(AVG(s.grade), 2) as average_grade
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        JOIN users u ON c.teacher_id = u.id
        LEFT JOIN assignments a ON c.id = a.course_id AND a.status = 'active'
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = $1
        WHERE ce.user_id = $1 AND ce.status = 'active'
        GROUP BY c.id, c.name, u.name
        ORDER BY c.name
      `;

      const [overview, activity, gradeDistribution, courseProgress] = await Promise.all([
        db.query(overviewQuery, [studentId]),
        db.query(recentActivityQuery, [studentId]),
        db.query(gradeDistributionQuery, [studentId]),
        db.query(courseProgressQuery, [studentId])
      ]);

      return {
        overview: overview.rows[0],
        activity: activity.rows[0],
        gradeDistribution: gradeDistribution.rows[0],
        courseProgress: courseProgress.rows,
        role: 'siswa',
        timeframe
      };
    } catch (error) {
      logger.error(`Failed to get student analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get course analytics
   * @param {number} courseId - Course ID
   * @param {number} userId - User ID (for permission checking)
   * @param {string} userRole - User role
   */
  static async getCourseAnalytics(courseId, userId, userRole) {
    try {
      // Verify user has access to course analytics
      const hasAccess = await this.verifyCourseAccess(courseId, userId, userRole);
      if (!hasAccess) {
        throw new Error('Access denied to course analytics');
      }

      // Get course overview
      const overviewQuery = `
        SELECT 
          c.name as course_name,
          c.description,
          u.name as teacher_name,
          COUNT(DISTINCT ce.user_id) as enrolled_students,
          COUNT(a.id) as total_assignments,
          COUNT(m.id) as total_materials,
          COUNT(s.id) as total_submissions,
          ROUND(AVG(s.grade), 2) as average_grade
        FROM courses c
        JOIN users u ON c.teacher_id = u.id
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
        LEFT JOIN assignments a ON c.id = a.course_id
        LEFT JOIN materials m ON c.id = m.course_id
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
        WHERE c.id = $1
        GROUP BY c.id, c.name, c.description, u.name
      `;

      // Get assignment performance
      const assignmentPerformanceQuery = `
        SELECT 
          a.id,
          a.title,
          a.type,
          a.max_score,
          COUNT(s.id) as submission_count,
          COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_count,
          ROUND(AVG(s.grade), 2) as average_grade,
          MIN(s.grade) as min_grade,
          MAX(s.grade) as max_grade
        FROM assignments a
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
        WHERE a.course_id = $1
        GROUP BY a.id, a.title, a.type, a.max_score
        ORDER BY a.created_at DESC
      `;

      // Get student performance
      const studentPerformanceQuery = `
        SELECT 
          u.id,
          u.name,
          u.email,
          COUNT(s.id) as submissions_count,
          COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_count,
          ROUND(AVG(s.grade), 2) as average_grade,
          MAX(s.created_at) as last_submission
        FROM course_enrollments ce
        JOIN users u ON ce.user_id = u.id
        LEFT JOIN assignment_submissions s ON s.student_id = u.id
        LEFT JOIN assignments a ON s.assignment_id = a.id AND a.course_id = $1
        WHERE ce.course_id = $1 AND ce.status = 'active' AND u.role = 'siswa'
        GROUP BY u.id, u.name, u.email
        ORDER BY average_grade DESC NULLS LAST
      `;

      const [overview, assignmentPerformance, studentPerformance] = await Promise.all([
        db.query(overviewQuery, [courseId]),
        db.query(assignmentPerformanceQuery, [courseId]),
        db.query(studentPerformanceQuery, [courseId])
      ]);

      return {
        overview: overview.rows[0],
        assignmentPerformance: assignmentPerformance.rows,
        studentPerformance: studentPerformance.rows,
        courseId
      };
    } catch (error) {
      logger.error(`Failed to get course analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get system usage analytics (Admin only)
   */
  static async getSystemUsageAnalytics(timeframe = 'month') {
    try {
      const timeCondition = this.getTimeCondition(timeframe);

      // Get daily activity for the timeframe
      const dailyActivityQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as activity_count
        FROM activity_logs
        WHERE ${timeCondition}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      // Get popular content types
      const contentTypesQuery = `
        SELECT 
          resource_type,
          COUNT(*) as access_count
        FROM activity_logs
        WHERE ${timeCondition} AND resource_type IS NOT NULL
        GROUP BY resource_type
        ORDER BY access_count DESC
      `;

      // Get user engagement
      const userEngagementQuery = `
        SELECT 
          COUNT(DISTINCT user_id) as active_users,
          COUNT(*) as total_activities,
          ROUND(COUNT(*)::float / COUNT(DISTINCT user_id), 2) as avg_activities_per_user
        FROM activity_logs
        WHERE ${timeCondition}
      `;

      const [dailyActivity, contentTypes, userEngagement] = await Promise.all([
        db.query(dailyActivityQuery),
        db.query(contentTypesQuery),
        db.query(userEngagementQuery)
      ]);

      return {
        dailyActivity: dailyActivity.rows,
        contentTypes: contentTypes.rows,
        userEngagement: userEngagement.rows[0],
        timeframe
      };
    } catch (error) {
      logger.error(`Failed to get system usage analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify user has access to course analytics
   */
  static async verifyCourseAccess(courseId, userId, userRole) {
    try {
      if (userRole === 'admin') {
        return true;
      }

      const query = `
        SELECT 1 FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
        WHERE c.id = $1 AND (
          c.teacher_id = $2 OR 
          (ce.user_id = $2 AND ce.status = 'active')
        )
      `;

      const result = await db.query(query, [courseId, userId]);
      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Failed to verify course access: ${error.message}`);
      return false;
    }
  }

  /**
   * Get time condition for SQL queries
   */
  static getTimeCondition(timeframe) {
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
   * Update course analytics cache
   */
  static async updateCourseAnalytics(courseId) {
    try {
      // Calculate and update course analytics
      const analyticsQuery = `
        INSERT INTO course_analytics (course_id, total_students, completed_assignments, average_completion_rate, average_grade, updated_at)
        SELECT 
          $1,
          (SELECT COUNT(DISTINCT ce.user_id) FROM course_enrollments ce WHERE ce.course_id = $1 AND ce.status = 'active'),
          (SELECT COUNT(*) FROM assignments a WHERE a.course_id = $1 AND a.status = 'active'),
          COALESCE((
            SELECT ROUND(AVG(completion_rate), 2) FROM (
              SELECT 
                COUNT(s.id)::float / COUNT(a.id) * 100 as completion_rate
              FROM assignments a
              LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
              WHERE a.course_id = $1
              GROUP BY a.id
            ) as completion_rates
          ), 0),
          COALESCE((
            SELECT ROUND(AVG(s.grade), 2)
            FROM assignment_submissions s
            JOIN assignments a ON s.assignment_id = a.id
            WHERE a.course_id = $1 AND s.grade IS NOT NULL
          ), 0),
          NOW()
        ON CONFLICT (course_id) DO UPDATE SET
          total_students = EXCLUDED.total_students,
          completed_assignments = EXCLUDED.completed_assignments,
          average_completion_rate = EXCLUDED.average_completion_rate,
          average_grade = EXCLUDED.average_grade,
          updated_at = EXCLUDED.updated_at
      `;

      await db.query(analyticsQuery, [courseId]);
    } catch (error) {
      logger.error(`Failed to update course analytics: ${error.message}`);
    }
  }

  /**
   * Update user statistics
   */
  static async updateUserStatistics(userId) {
    try {
      const statsQuery = `
        INSERT INTO user_statistics (user_id, courses_enrolled, assignments_completed, average_grade, last_activity, updated_at)
        SELECT 
          $1,
          (SELECT COUNT(*) FROM course_enrollments WHERE user_id = $1 AND status = 'active'),
          (SELECT COUNT(*) FROM assignment_submissions WHERE student_id = $1),
          COALESCE((SELECT ROUND(AVG(grade), 2) FROM assignment_submissions WHERE student_id = $1 AND grade IS NOT NULL), 0),
          NOW(),
          NOW()
        ON CONFLICT (user_id) DO UPDATE SET
          courses_enrolled = EXCLUDED.courses_enrolled,
          assignments_completed = EXCLUDED.assignments_completed,
          average_grade = EXCLUDED.average_grade,
          last_activity = EXCLUDED.last_activity,
          updated_at = EXCLUDED.updated_at
      `;

      await db.query(statsQuery, [userId]);
    } catch (error) {
      logger.error(`Failed to update user statistics: ${error.message}`);
    }
  }
}

module.exports = Analytics;