const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Grading Model - Handles rubric creation, grade calculation, and feedback storage
 */
class GradingModel {

  /**
   * Create a new grading rubric
   * @param {Object} rubricData - Rubric data
   */
  static async createRubric(rubricData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const { assignment_id, name, total_points, criteria } = rubricData;

      // Validate criteria structure
      this.validateCriteria(criteria);

      // Calculate total points from criteria
      const calculatedTotal = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
      
      if (calculatedTotal !== total_points) {
        throw new Error(`Total points mismatch: expected ${total_points}, calculated ${calculatedTotal}`);
      }

      const query = `
        INSERT INTO grading_rubrics (assignment_id, name, total_points, criteria)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const values = [assignment_id, name, total_points, JSON.stringify(criteria)];
      const { rows } = await client.query(query, values);

      await client.query('COMMIT');
      logger.info(`Created grading rubric: ${rows[0].id} for assignment: ${assignment_id}`);
      
      return rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to create rubric: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get rubric by assignment ID
   */
  static async getRubricByAssignmentId(assignmentId) {
    try {
      const query = 'SELECT * FROM grading_rubrics WHERE assignment_id = $1';
      const { rows } = await db.query(query, [assignmentId]);
      
      if (rows.length > 0) {
        const rubric = rows[0];
        // Parse criteria JSON
        rubric.criteria = typeof rubric.criteria === 'string' 
          ? JSON.parse(rubric.criteria) 
          : rubric.criteria;
        return rubric;
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to get rubric by assignment ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get rubric by ID
   */
  static async getRubricById(rubricId) {
    try {
      const query = 'SELECT * FROM grading_rubrics WHERE id = $1';
      const { rows } = await db.query(query, [rubricId]);
      
      if (rows.length > 0) {
        const rubric = rows[0];
        rubric.criteria = typeof rubric.criteria === 'string' 
          ? JSON.parse(rubric.criteria) 
          : rubric.criteria;
        return rubric;
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to get rubric by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update rubric
   */
  static async updateRubric(rubricId, rubricData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const { name, total_points, criteria } = rubricData;

      if (criteria) {
        this.validateCriteria(criteria);
        
        const calculatedTotal = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
        if (calculatedTotal !== total_points) {
          throw new Error(`Total points mismatch: expected ${total_points}, calculated ${calculatedTotal}`);
        }
      }

      const query = `
        UPDATE grading_rubrics 
        SET 
          name = COALESCE($1, name),
          total_points = COALESCE($2, total_points),
          criteria = COALESCE($3, criteria)
        WHERE id = $4
        RETURNING *
      `;

      const values = [
        name, 
        total_points, 
        criteria ? JSON.stringify(criteria) : null, 
        rubricId
      ];

      const { rows } = await client.query(query, values);

      await client.query('COMMIT');
      
      if (rows.length > 0) {
        const rubric = rows[0];
        rubric.criteria = typeof rubric.criteria === 'string' 
          ? JSON.parse(rubric.criteria) 
          : rubric.criteria;
        return rubric;
      }
      
      return null;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to update rubric: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete rubric
   */
  static async deleteRubric(rubricId) {
    try {
      const query = 'DELETE FROM grading_rubrics WHERE id = $1 RETURNING id';
      const { rows } = await db.query(query, [rubricId]);
      
      return rows.length > 0;
    } catch (error) {
      logger.error(`Failed to delete rubric: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit grade for assignment submission
   */
  static async submitGrade(submissionId, gradeData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const { grade, feedback, rubric_scores = null, graded_by } = gradeData;

      // Validate grade
      if (typeof grade !== 'number' || grade < 0) {
        throw new Error('Grade must be a non-negative number');
      }

      // Get submission details
      const submissionQuery = `
        SELECT s.*, a.max_score 
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.id = $1
      `;
      
      const { rows: submissions } = await client.query(submissionQuery, [submissionId]);
      
      if (submissions.length === 0) {
        throw new Error('Submission not found');
      }

      const submission = submissions[0];

      // Validate grade against max score
      if (grade > submission.max_score) {
        throw new Error(`Grade ${grade} exceeds maximum score ${submission.max_score}`);
      }

      // Update submission with grade and feedback
      const updateQuery = `
        UPDATE assignment_submissions 
        SET 
          grade = $1,
          feedback = $2,
          status = 'graded',
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;

      // Prepare feedback object
      const feedbackObj = {
        text: feedback,
        rubric_scores,
        graded_by,
        graded_at: new Date().toISOString(),
        grade_breakdown: rubric_scores ? this.calculateGradeBreakdown(rubric_scores) : null
      };

      const { rows: updatedSubmissions } = await client.query(updateQuery, [
        grade,
        JSON.stringify(feedbackObj),
        submissionId
      ]);

      // Update user statistics
      await this.updateUserStatistics(submission.student_id);

      await client.query('COMMIT');
      
      logger.info(`Submitted grade ${grade} for submission ${submissionId}`);
      
      return updatedSubmissions[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to submit grade: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get grades for an assignment
   */
  static async getGradesByAssignment(assignmentId, filters = {}) {
    try {
      let query = `
        SELECT 
          s.*,
          u.name as student_name,
          u.email as student_email
        FROM assignment_submissions s
        JOIN users u ON s.student_id = u.id
        WHERE s.assignment_id = $1
      `;
      
      const values = [assignmentId];
      let paramIndex = 2;

      if (filters.status) {
        query += ` AND s.status = $${paramIndex++}`;
        values.push(filters.status);
      }

      if (filters.graded !== undefined) {
        if (filters.graded) {
          query += ` AND s.grade IS NOT NULL`;
        } else {
          query += ` AND s.grade IS NULL`;
        }
      }

      query += ' ORDER BY u.name ASC';

      const { rows } = await db.query(query, values);
      
      // Parse feedback JSON
      return rows.map(row => ({
        ...row,
        feedback: this.parseFeedback(row.feedback)
      }));
    } catch (error) {
      logger.error(`Failed to get grades by assignment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get grade statistics for assignment
   */
  static async getGradeStatistics(assignmentId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_submissions,
          COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as graded_count,
          ROUND(AVG(grade), 2) as average_grade,
          MAX(grade) as highest_grade,
          MIN(grade) as lowest_grade,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY grade) as median_grade,
          COUNT(CASE WHEN grade >= 90 THEN 1 END) as a_grades,
          COUNT(CASE WHEN grade >= 80 AND grade < 90 THEN 1 END) as b_grades,
          COUNT(CASE WHEN grade >= 70 AND grade < 80 THEN 1 END) as c_grades,
          COUNT(CASE WHEN grade >= 60 AND grade < 70 THEN 1 END) as d_grades,
          COUNT(CASE WHEN grade < 60 THEN 1 END) as f_grades
        FROM assignment_submissions 
        WHERE assignment_id = $1
      `;

      const { rows } = await db.query(query, [assignmentId]);
      return rows[0];
    } catch (error) {
      logger.error(`Failed to get grade statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get student grades for all assignments in a course
   */
  static async getStudentCourseGrades(studentId, courseId) {
    try {
      const query = `
        SELECT 
          a.id as assignment_id,
          a.title as assignment_title,
          a.max_score,
          a.due_date,
          s.grade,
          s.feedback,
          s.status as submission_status,
          s.created_at as submitted_at
        FROM assignments a
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = $1
        WHERE a.course_id = $2
        ORDER BY a.created_at ASC
      `;

      const { rows } = await db.query(query, [studentId, courseId]);
      
      return rows.map(row => ({
        ...row,
        feedback: this.parseFeedback(row.feedback),
        percentage: row.grade && row.max_score ? (row.grade / row.max_score) * 100 : null
      }));
    } catch (error) {
      logger.error(`Failed to get student course grades: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk grade submissions
   */
  static async bulkGradeSubmissions(grades) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const results = [];

      for (const gradeData of grades) {
        const { submission_id, grade, feedback, rubric_scores, graded_by } = gradeData;
        
        const result = await this.submitGrade(submission_id, {
          grade,
          feedback,
          rubric_scores,
          graded_by
        });
        
        results.push(result);
      }

      await client.query('COMMIT');
      
      logger.info(`Bulk graded ${results.length} submissions`);
      
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to bulk grade submissions: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate criteria structure
   */
  static validateCriteria(criteria) {
    if (!Array.isArray(criteria)) {
      throw new Error('Criteria must be an array');
    }

    if (criteria.length === 0) {
      throw new Error('Rubric must have at least one criterion');
    }

    criteria.forEach((criterion, index) => {
      const requiredFields = ['name', 'description', 'maxPoints'];
      
      for (const field of requiredFields) {
        if (!criterion[field]) {
          throw new Error(`Missing required field '${field}' in criterion ${index + 1}`);
        }
      }

      if (typeof criterion.maxPoints !== 'number' || criterion.maxPoints <= 0) {
        throw new Error(`Max points must be a positive number in criterion ${index + 1}`);
      }

      if (criterion.levels) {
        this.validateLevels(criterion.levels, index);
      }
    });
  }

  /**
   * Validate rubric levels
   */
  static validateLevels(levels, criterionIndex) {
    if (!Array.isArray(levels)) {
      throw new Error(`Levels must be an array in criterion ${criterionIndex + 1}`);
    }

    levels.forEach((level, levelIndex) => {
      const requiredFields = ['name', 'description', 'points'];
      
      for (const field of requiredFields) {
        if (!level[field]) {
          throw new Error(`Missing required field '${field}' in level ${levelIndex + 1} of criterion ${criterionIndex + 1}`);
        }
      }

      if (typeof level.points !== 'number' || level.points < 0) {
        throw new Error(`Points must be a non-negative number in level ${levelIndex + 1} of criterion ${criterionIndex + 1}`);
      }
    });
  }

  /**
   * Calculate grade breakdown from rubric scores
   */
  static calculateGradeBreakdown(rubricScores) {
    const breakdown = {};
    let totalScore = 0;

    Object.entries(rubricScores).forEach(([criterionId, score]) => {
      breakdown[criterionId] = score;
      totalScore += score;
    });

    breakdown.total = totalScore;
    return breakdown;
  }

  /**
   * Parse feedback JSON safely
   */
  static parseFeedback(feedback) {
    if (!feedback) return null;
    
    try {
      return typeof feedback === 'string' ? JSON.parse(feedback) : feedback;
    } catch (error) {
      logger.warn(`Failed to parse feedback JSON: ${error.message}`);
      return { text: feedback };
    }
  }

  /**
   * Update user statistics after grading
   */
  static async updateUserStatistics(userId) {
    try {
      const query = `
        INSERT INTO user_statistics (user_id, assignments_completed, average_grade, updated_at)
        VALUES ($1, 1, (
          SELECT ROUND(AVG(grade), 2) 
          FROM assignment_submissions 
          WHERE student_id = $1 AND grade IS NOT NULL
        ), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          assignments_completed = (
            SELECT COUNT(*) 
            FROM assignment_submissions 
            WHERE student_id = $1 AND grade IS NOT NULL
          ),
          average_grade = (
            SELECT ROUND(AVG(grade), 2) 
            FROM assignment_submissions 
            WHERE student_id = $1 AND grade IS NOT NULL
          ),
          updated_at = NOW()
      `;

      await db.query(query, [userId]);
    } catch (error) {
      logger.error(`Failed to update user statistics: ${error.message}`);
      // Don't throw error as this is not critical
    }
  }
}

module.exports = GradingModel;