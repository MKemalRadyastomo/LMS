const Analytics = require('../models/analytics.model');
const logger = require('../utils/logger');

/**
 * Analytics Service - Business logic for analytics operations
 */
class AnalyticsService {

  /**
   * Get dashboard analytics with caching and optimization
   * @param {Object} user - Current user object
   * @param {string} timeframe - Time frame for analytics
   */
  static async getDashboardAnalytics(user, timeframe = 'month') {
    try {
      const analytics = await Analytics.getDashboardAnalytics(user, timeframe);
      
      // Add calculated metrics and insights
      const enhancedAnalytics = this.enhanceAnalytics(analytics, user.role);
      
      return enhancedAnalytics;
    } catch (error) {
      logger.error(`Analytics service error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get comprehensive course analytics
   * @param {number} courseId - Course ID
   * @param {Object} user - Current user object
   */
  static async getCourseAnalytics(courseId, user) {
    try {
      const analytics = await Analytics.getCourseAnalytics(courseId, user.id, user.role);
      
      // Add insights and recommendations
      const insights = this.generateCourseInsights(analytics);
      
      return {
        ...analytics,
        insights,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Course analytics service error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get system usage analytics (Admin only)
   * @param {string} timeframe - Time frame for analytics
   */
  static async getSystemUsageAnalytics(timeframe = 'month') {
    try {
      const analytics = await Analytics.getSystemUsageAnalytics(timeframe);
      
      // Add trend analysis
      const trendsAnalysis = this.analyzeTrends(analytics.dailyActivity);
      
      return {
        ...analytics,
        trends: trendsAnalysis,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`System usage analytics service error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get performance metrics for a specific assignment
   * @param {number} assignmentId - Assignment ID
   * @param {Object} user - Current user object
   */
  static async getAssignmentAnalytics(assignmentId, user) {
    try {
      const db = require('../config/db');
      
      // Get assignment details and statistics
      const query = `
        SELECT 
          a.id,
          a.title,
          a.type,
          a.max_score,
          a.due_date,
          c.name as course_name,
          c.teacher_id,
          COUNT(s.id) as total_submissions,
          COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_submissions,
          ROUND(AVG(s.grade), 2) as average_grade,
          MIN(s.grade) as min_grade,
          MAX(s.grade) as max_grade,
          ROUND(STDDEV(s.grade), 2) as grade_stddev,
          COUNT(CASE WHEN s.grade >= 90 THEN 1 END) as a_grades,
          COUNT(CASE WHEN s.grade >= 80 AND s.grade < 90 THEN 1 END) as b_grades,
          COUNT(CASE WHEN s.grade >= 70 AND s.grade < 80 THEN 1 END) as c_grades,
          COUNT(CASE WHEN s.grade >= 60 AND s.grade < 70 THEN 1 END) as d_grades,
          COUNT(CASE WHEN s.grade < 60 THEN 1 END) as f_grades
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
        WHERE a.id = $1
        GROUP BY a.id, a.title, a.type, a.max_score, a.due_date, c.name, c.teacher_id
      `;

      const result = await db.query(query, [assignmentId]);
      const assignment = result.rows[0];

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      // Check access permissions
      const hasAccess = user.role === 'admin' || 
                       assignment.teacher_id === user.id ||
                       await this.checkStudentEnrollment(user.id, assignmentId);

      if (!hasAccess) {
        throw new Error('Access denied to assignment analytics');
      }

      // Calculate additional metrics
      const analytics = this.calculateAssignmentMetrics(assignment);

      return analytics;
    } catch (error) {
      logger.error(`Assignment analytics service error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate learning insights for a student
   * @param {number} studentId - Student ID
   * @param {Object} requestingUser - User requesting the insights
   */
  static async getStudentLearningInsights(studentId, requestingUser) {
    try {
      // Check if requesting user has permission to view student insights
      if (requestingUser.role === 'siswa' && requestingUser.id !== studentId) {
        throw new Error('Access denied to other student insights');
      }

      const db = require('../config/db');

      // Get comprehensive student data
      const studentDataQuery = `
        SELECT 
          u.id,
          u.name,
          u.email,
          COUNT(DISTINCT ce.course_id) as enrolled_courses,
          COUNT(a.id) as total_assignments,
          COUNT(s.id) as completed_assignments,
          ROUND(AVG(s.grade), 2) as overall_average,
          COUNT(CASE WHEN s.created_at > NOW() - INTERVAL '1 week' THEN 1 END) as recent_submissions,
          MAX(s.created_at) as last_submission_date
        FROM users u
        LEFT JOIN course_enrollments ce ON u.id = ce.user_id AND ce.status = 'active'
        LEFT JOIN assignments a ON ce.course_id = a.course_id AND a.status = 'active'
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = u.id
        WHERE u.id = $1 AND u.role = 'siswa'
        GROUP BY u.id, u.name, u.email
      `;

      // Get subject performance
      const subjectPerformanceQuery = `
        SELECT 
          c.name as course_name,
          COUNT(s.id) as assignments_completed,
          ROUND(AVG(s.grade), 2) as average_grade,
          COUNT(CASE WHEN s.grade >= 80 THEN 1 END) as high_grades,
          MAX(s.created_at) as last_activity
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        LEFT JOIN assignments a ON c.id = a.course_id
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = $1
        WHERE ce.user_id = $1 AND ce.status = 'active'
        GROUP BY c.id, c.name
        HAVING COUNT(s.id) > 0
        ORDER BY average_grade DESC
      `;

      const [studentData, subjectPerformance] = await Promise.all([
        db.query(studentDataQuery, [studentId]),
        db.query(subjectPerformanceQuery, [studentId])
      ]);

      const student = studentData.rows[0];
      if (!student) {
        throw new Error('Student not found');
      }

      // Generate insights
      const insights = this.generateStudentInsights(student, subjectPerformance.rows);

      return {
        student,
        subjectPerformance: subjectPerformance.rows,
        insights,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Student learning insights service error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enhance analytics with calculated metrics and insights
   */
  static enhanceAnalytics(analytics, userRole) {
    try {
      const enhanced = { ...analytics };

      // Add role-specific enhancements
      switch (userRole) {
        case 'admin':
          enhanced.systemHealth = this.calculateSystemHealth(analytics);
          enhanced.growthMetrics = this.calculateGrowthMetrics(analytics);
          break;
        case 'guru':
          enhanced.teachingEffectiveness = this.calculateTeachingEffectiveness(analytics);
          enhanced.studentEngagement = this.calculateStudentEngagement(analytics);
          break;
        case 'siswa':
          enhanced.learningProgress = this.calculateLearningProgress(analytics);
          enhanced.performanceInsights = this.calculatePerformanceInsights(analytics);
          break;
      }

      return enhanced;
    } catch (error) {
      logger.error(`Failed to enhance analytics: ${error.message}`);
      return analytics;
    }
  }

  /**
   * Generate course insights and recommendations
   */
  static generateCourseInsights(analytics) {
    const insights = [];

    if (analytics.overview) {
      const { enrolled_students, total_assignments, total_submissions, average_grade } = analytics.overview;

      // Engagement insight
      if (total_assignments > 0 && total_submissions > 0) {
        const submissionRate = (total_submissions / (enrolled_students * total_assignments)) * 100;
        if (submissionRate < 50) {
          insights.push({
            type: 'engagement',
            level: 'warning',
            message: `Low submission rate (${submissionRate.toFixed(1)}%). Consider deadline extensions or clarifying assignment requirements.`
          });
        } else if (submissionRate > 80) {
          insights.push({
            type: 'engagement',
            level: 'success',
            message: `Excellent submission rate (${submissionRate.toFixed(1)}%). Students are highly engaged.`
          });
        }
      }

      // Performance insight
      if (average_grade) {
        if (average_grade < 70) {
          insights.push({
            type: 'performance',
            level: 'warning',
            message: `Average grade is ${average_grade}%. Consider reviewing course difficulty or providing additional support.`
          });
        } else if (average_grade > 85) {
          insights.push({
            type: 'performance',
            level: 'success',
            message: `Strong performance with ${average_grade}% average. Consider adding challenge activities.`
          });
        }
      }
    }

    return insights;
  }

  /**
   * Analyze trends from daily activity data
   */
  static analyzeTrends(dailyActivity) {
    if (!dailyActivity || dailyActivity.length < 7) {
      return { trend: 'insufficient_data', change: 0 };
    }

    const recent = dailyActivity.slice(0, 7);
    const previous = dailyActivity.slice(7, 14);

    const recentAvg = recent.reduce((sum, day) => sum + parseInt(day.activity_count), 0) / recent.length;
    const previousAvg = previous.length > 0 
      ? previous.reduce((sum, day) => sum + parseInt(day.activity_count), 0) / previous.length 
      : recentAvg;

    const change = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    let trend = 'stable';
    if (change > 10) trend = 'increasing';
    if (change < -10) trend = 'decreasing';

    return {
      trend,
      change: Math.round(change * 100) / 100,
      recentAverage: Math.round(recentAvg * 100) / 100,
      previousAverage: Math.round(previousAvg * 100) / 100
    };
  }

  /**
   * Calculate assignment-specific metrics
   */
  static calculateAssignmentMetrics(assignment) {
    const {
      total_submissions,
      graded_submissions,
      average_grade,
      min_grade,
      max_grade,
      grade_stddev,
      a_grades,
      b_grades,
      c_grades,
      d_grades,
      f_grades
    } = assignment;

    const completionRate = total_submissions > 0 ? (graded_submissions / total_submissions) * 100 : 0;
    const gradeRange = max_grade && min_grade ? max_grade - min_grade : 0;
    
    // Calculate difficulty level based on average grade
    let difficultyLevel = 'moderate';
    if (average_grade < 60) difficultyLevel = 'challenging';
    if (average_grade > 85) difficultyLevel = 'easy';

    return {
      ...assignment,
      metrics: {
        completionRate: Math.round(completionRate * 100) / 100,
        gradeRange,
        difficultyLevel,
        gradeDistribution: {
          A: parseInt(a_grades) || 0,
          B: parseInt(b_grades) || 0,
          C: parseInt(c_grades) || 0,
          D: parseInt(d_grades) || 0,
          F: parseInt(f_grades) || 0
        }
      }
    };
  }

  /**
   * Generate student-specific insights
   */
  static generateStudentInsights(student, subjectPerformance) {
    const insights = [];

    // Overall performance insight
    if (student.overall_average) {
      if (student.overall_average >= 90) {
        insights.push({
          type: 'performance',
          level: 'success',
          message: 'Excellent overall performance! Keep up the great work.'
        });
      } else if (student.overall_average < 70) {
        insights.push({
          type: 'performance',
          level: 'warning',
          message: 'Consider seeking additional help or tutoring to improve performance.'
        });
      }
    }

    // Completion rate insight
    if (student.total_assignments > 0) {
      const completionRate = (student.completed_assignments / student.total_assignments) * 100;
      if (completionRate < 80) {
        insights.push({
          type: 'engagement',
          level: 'warning',
          message: `Assignment completion rate is ${completionRate.toFixed(1)}%. Try to stay current with coursework.`
        });
      }
    }

    // Subject strength/weakness analysis
    if (subjectPerformance.length > 1) {
      const sortedSubjects = [...subjectPerformance].sort((a, b) => b.average_grade - a.average_grade);
      const strongest = sortedSubjects[0];
      const weakest = sortedSubjects[sortedSubjects.length - 1];

      if (strongest.average_grade - weakest.average_grade > 20) {
        insights.push({
          type: 'subjects',
          level: 'info',
          message: `Strongest subject: ${strongest.course_name} (${strongest.average_grade}%). Consider focusing more on ${weakest.course_name}.`
        });
      }
    }

    return insights;
  }

  /**
   * Calculate system health metrics
   */
  static calculateSystemHealth(analytics) {
    // Placeholder for system health calculation
    return {
      overall: 'good',
      userGrowth: 'positive',
      courseEngagement: 'high',
      systemLoad: 'normal'
    };
  }

  /**
   * Calculate growth metrics
   */
  static calculateGrowthMetrics(analytics) {
    // Placeholder for growth metrics calculation
    return {
      userGrowthRate: 15.5,
      courseCreationRate: 8.2,
      engagementTrend: 'increasing'
    };
  }

  /**
   * Calculate teaching effectiveness
   */
  static calculateTeachingEffectiveness(analytics) {
    if (!analytics.gradeStats) return null;

    const { total_graded, average_grade } = analytics.gradeStats;
    
    return {
      studentsGraded: total_graded || 0,
      averageGrade: average_grade || 0,
      effectiveness: average_grade > 80 ? 'high' : average_grade > 70 ? 'moderate' : 'needs_improvement'
    };
  }

  /**
   * Calculate student engagement
   */
  static calculateStudentEngagement(analytics) {
    // Placeholder for student engagement calculation
    return {
      overallEngagement: 'high',
      participationRate: 85.2,
      submissionTrend: 'stable'
    };
  }

  /**
   * Calculate learning progress
   */
  static calculateLearningProgress(analytics) {
    if (!analytics.overview) return null;

    const { enrolled_courses, submitted_assignments, graded_assignments, average_grade } = analytics.overview;
    
    return {
      coursesActive: enrolled_courses || 0,
      assignmentsCompleted: submitted_assignments || 0,
      currentGPA: average_grade || 0,
      progressTrend: average_grade > 80 ? 'excellent' : average_grade > 70 ? 'good' : 'needs_improvement'
    };
  }

  /**
   * Calculate performance insights
   */
  static calculatePerformanceInsights(analytics) {
    // Placeholder for performance insights calculation
    return {
      strengths: ['Time management', 'Assignment completion'],
      areasForImprovement: ['Quiz performance', 'Participation'],
      recommendations: ['Review quiz strategies', 'Increase class participation']
    };
  }

  /**
   * Check if student is enrolled in the assignment's course
   */
  static async checkStudentEnrollment(studentId, assignmentId) {
    try {
      const db = require('../config/db');
      const query = `
        SELECT 1 FROM course_enrollments ce
        JOIN assignments a ON ce.course_id = a.course_id
        WHERE ce.user_id = $1 AND a.id = $2 AND ce.status = 'active'
      `;
      
      const result = await db.query(query, [studentId, assignmentId]);
      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Failed to check student enrollment: ${error.message}`);
      return false;
    }
  }
}

module.exports = AnalyticsService;