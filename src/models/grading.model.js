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

  // =====================================================
  // ENHANCED RUBRIC MANAGEMENT
  // =====================================================

  /**
   * Create detailed rubric with individual criteria
   */
  static async createDetailedRubric(rubricData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const { assignment_id, name, total_points, criteria } = rubricData;

      // Create main rubric
      const rubric = await this.createRubric({
        assignment_id,
        name,
        total_points,
        criteria
      });

      // Create individual criteria records
      for (let i = 0; i < criteria.length; i++) {
        const criterion = criteria[i];
        
        const criterionQuery = `
          INSERT INTO grading_criteria (
            rubric_id, name, description, max_points, weight, order_index, performance_levels
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        const values = [
          rubric.id,
          criterion.name,
          criterion.description,
          criterion.maxPoints,
          criterion.weight || 1.0,
          i,
          criterion.levels ? JSON.stringify(criterion.levels) : null
        ];
        
        await client.query(criterionQuery, values);
      }

      await client.query('COMMIT');
      logger.info(`Created detailed rubric: ${rubric.id} with ${criteria.length} criteria`);
      
      return rubric;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to create detailed rubric: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get rubric with detailed criteria
   */
  static async getDetailedRubric(rubricId) {
    try {
      const rubricQuery = 'SELECT * FROM grading_rubrics WHERE id = $1';
      const { rows: rubrics } = await db.query(rubricQuery, [rubricId]);
      
      if (rubrics.length === 0) {
        return null;
      }

      const rubric = rubrics[0];
      rubric.criteria = typeof rubric.criteria === 'string' 
        ? JSON.parse(rubric.criteria) 
        : rubric.criteria;

      // Get detailed criteria
      const criteriaQuery = `
        SELECT * FROM grading_criteria 
        WHERE rubric_id = $1 
        ORDER BY order_index
      `;
      
      const { rows: criteria } = await db.query(criteriaQuery, [rubricId]);
      
      rubric.detailed_criteria = criteria.map(criterion => ({
        ...criterion,
        performance_levels: typeof criterion.performance_levels === 'string'
          ? JSON.parse(criterion.performance_levels)
          : criterion.performance_levels
      }));

      return rubric;
    } catch (error) {
      logger.error(`Failed to get detailed rubric: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit detailed grade with criterion scores
   */
  static async submitDetailedGrade(submissionId, gradeData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const { 
        grade, feedback, criterion_scores, rubric_id, 
        additional_points, deductions, graded_by 
      } = gradeData;

      // Submit basic grade
      const submission = await this.submitGrade(submissionId, {
        grade,
        feedback,
        graded_by
      });

      // Create grading details record
      const detailsQuery = `
        INSERT INTO grading_details (
          submission_id, rubric_id, rubric_scores, additional_points,
          deductions, total_score, percentage, letter_grade, grader_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const percentage = (grade / 100) * 100; // Assuming grade is already a percentage
      const letterGrade = this.calculateLetterGrade(percentage);
      
      const { rows: details } = await client.query(detailsQuery, [
        submissionId,
        rubric_id,
        criterion_scores ? JSON.stringify(criterion_scores) : null,
        additional_points || 0,
        deductions || 0,
        grade,
        percentage,
        letterGrade,
        graded_by
      ]);

      // Submit individual criterion scores
      if (criterion_scores) {
        for (const [criterionId, score] of Object.entries(criterion_scores)) {
          const scoreQuery = `
            INSERT INTO submission_scores (
              submission_id, criterion_id, points_earned, comments
            ) VALUES ($1, $2, $3, $4)
            ON CONFLICT (submission_id, criterion_id)
            DO UPDATE SET
              points_earned = EXCLUDED.points_earned,
              comments = EXCLUDED.comments,
              graded_at = CURRENT_TIMESTAMP
          `;
          
          await client.query(scoreQuery, [
            submissionId,
            criterionId,
            score.points,
            score.comments || null
          ]);
        }
      }

      await client.query('COMMIT');
      logger.info(`Submitted detailed grade for submission ${submissionId}`);
      
      return {
        submission,
        details: details[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to submit detailed grade: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate letter grade from percentage
   */
  static calculateLetterGrade(percentage) {
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  }

  /**
   * Get detailed grading information
   */
  static async getDetailedGrading(submissionId) {
    try {
      const query = `
        SELECT 
          s.*,
          gd.*,
          gr.name as rubric_name,
          gr.total_points as rubric_total_points,
          u.name as grader_name
        FROM assignment_submissions s
        LEFT JOIN grading_details gd ON s.id = gd.submission_id
        LEFT JOIN grading_rubrics gr ON gd.rubric_id = gr.id
        LEFT JOIN users u ON gd.grader_id = u.id
        WHERE s.id = $1
      `;
      
      const { rows } = await db.query(query, [submissionId]);
      
      if (rows.length === 0) {
        return null;
      }

      const result = rows[0];
      
      // Parse JSON fields
      if (result.rubric_scores) {
        result.rubric_scores = typeof result.rubric_scores === 'string'
          ? JSON.parse(result.rubric_scores)
          : result.rubric_scores;
      }

      // Get individual criterion scores
      const scoresQuery = `
        SELECT 
          ss.*,
          gc.name as criterion_name,
          gc.description as criterion_description,
          gc.max_points as criterion_max_points
        FROM submission_scores ss
        JOIN grading_criteria gc ON ss.criterion_id = gc.id
        WHERE ss.submission_id = $1
        ORDER BY gc.order_index
      `;
      
      const { rows: scores } = await db.query(scoresQuery, [submissionId]);
      result.criterion_scores = scores;

      return result;
    } catch (error) {
      logger.error(`Failed to get detailed grading: ${error.message}`);
      throw error;
    }
  }

  // =====================================================
  // AUTOMATED GRADING
  // =====================================================

  /**
   * Grade objective questions automatically
   */
  static async gradeObjectiveQuestions(submissionId) {
    try {
      // Get submission and assignment details
      const submissionQuery = `
        SELECT s.*, a.id as assignment_id, a.quiz_questions_json
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.id = $1
      `;
      
      const { rows: submissions } = await db.query(submissionQuery, [submissionId]);
      
      if (submissions.length === 0) {
        throw new Error('Submission not found');
      }

      const submission = submissions[0];
      const studentAnswers = typeof submission.quiz_answers_json === 'string'
        ? JSON.parse(submission.quiz_answers_json)
        : submission.quiz_answers_json;

      if (!studentAnswers) {
        return null;
      }

      // Get automated grading rules
      const rulesQuery = `
        SELECT * FROM automated_grading 
        WHERE assignment_id = $1 
        ORDER BY question_index
      `;
      
      const { rows: rules } = await db.query(rulesQuery, [submission.assignment_id]);

      let totalScore = 0;
      let maxPossibleScore = 0;
      const gradingResults = [];

      for (const rule of rules) {
        maxPossibleScore += rule.points;
        
        const studentAnswer = studentAnswers[rule.question_index]?.answer;
        let isCorrect = false;
        let pointsEarned = 0;

        if (studentAnswer !== undefined && studentAnswer !== null) {
          // Grade based on question type
          switch (rule.question_type) {
            case 'multiple_choice':
            case 'true_false':
              isCorrect = this.gradeExactMatch(studentAnswer, rule.correct_answer, rule.case_sensitive);
              pointsEarned = isCorrect ? rule.points : 0;
              break;
              
            case 'short_answer':
              const result = this.gradeShortAnswer(studentAnswer, rule);
              isCorrect = result.isCorrect;
              pointsEarned = result.points;
              break;
          }
        }

        totalScore += pointsEarned;
        gradingResults.push({
          question_index: rule.question_index,
          student_answer: studentAnswer,
          correct_answer: rule.correct_answer,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          max_points: rule.points
        });
      }

      // Calculate percentage
      const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

      // Update submission with auto-graded score
      await db.query(
        'UPDATE assignment_submissions SET grade = $1, status = $2 WHERE id = $3',
        [percentage, 'auto_graded', submissionId]
      );

      logger.info(`Auto-graded submission ${submissionId}: ${totalScore}/${maxPossibleScore} (${percentage}%)`);

      return {
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        percentage: percentage,
        grading_results: gradingResults
      };
    } catch (error) {
      logger.error(`Failed to grade objective questions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Grade exact match questions (multiple choice, true/false)
   */
  static gradeExactMatch(studentAnswer, correctAnswer, caseSensitive = false) {
    const student = caseSensitive ? studentAnswer.toString() : studentAnswer.toString().toLowerCase();
    const correct = caseSensitive ? correctAnswer.toString() : correctAnswer.toString().toLowerCase();
    
    return student.trim() === correct.trim();
  }

  /**
   * Grade short answer questions with variations and partial credit
   */
  static gradeShortAnswer(studentAnswer, rule) {
    const student = rule.case_sensitive 
      ? studentAnswer.toString().trim()
      : studentAnswer.toString().toLowerCase().trim();
    
    const correct = rule.case_sensitive 
      ? rule.correct_answer.toString().trim()
      : rule.correct_answer.toString().toLowerCase().trim();

    // Check exact match first
    if (student === correct) {
      return { isCorrect: true, points: rule.points };
    }

    // Check answer variations
    if (rule.answer_variations) {
      const variations = typeof rule.answer_variations === 'string'
        ? JSON.parse(rule.answer_variations)
        : rule.answer_variations;
      
      for (const variation of variations) {
        const varAnswer = rule.case_sensitive 
          ? variation.toString().trim()
          : variation.toString().toLowerCase().trim();
        
        if (student === varAnswer) {
          return { isCorrect: true, points: rule.points };
        }
      }
    }

    // Apply partial credit rules if configured
    if (rule.partial_credit_rules) {
      const partialRules = typeof rule.partial_credit_rules === 'string'
        ? JSON.parse(rule.partial_credit_rules)
        : rule.partial_credit_rules;
      
      for (const partialRule of partialRules) {
        if (this.matchesPartialCreditRule(student, partialRule)) {
          const partialPoints = Math.round(rule.points * partialRule.credit_percentage / 100);
          return { isCorrect: false, points: partialPoints };
        }
      }
    }

    return { isCorrect: false, points: 0 };
  }

  /**
   * Check if answer matches partial credit rule
   */
  static matchesPartialCreditRule(studentAnswer, rule) {
    switch (rule.type) {
      case 'contains':
        return studentAnswer.includes(rule.value.toLowerCase());
      case 'length':
        return studentAnswer.length >= rule.min_length && studentAnswer.length <= rule.max_length;
      case 'regex':
        const regex = new RegExp(rule.pattern, rule.flags || 'i');
        return regex.test(studentAnswer);
      default:
        return false;
    }
  }

  // =====================================================
  // ADVANCED ANALYTICS
  // =====================================================

  /**
   * Get comprehensive grading analytics
   */
  static async getGradingAnalytics(assignmentId, filters = {}) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_submissions,
          COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_count,
          COUNT(CASE WHEN s.status = 'auto_graded' THEN 1 END) as auto_graded_count,
          ROUND(AVG(s.grade), 2) as average_grade,
          ROUND(STDDEV(s.grade), 2) as grade_stddev,
          MAX(s.grade) as highest_grade,
          MIN(s.grade) as lowest_grade,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY s.grade) as q1_grade,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.grade) as median_grade,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY s.grade) as q3_grade,
          COUNT(CASE WHEN s.grade >= 97 THEN 1 END) as a_plus_count,
          COUNT(CASE WHEN s.grade >= 93 AND s.grade < 97 THEN 1 END) as a_count,
          COUNT(CASE WHEN s.grade >= 90 AND s.grade < 93 THEN 1 END) as a_minus_count,
          COUNT(CASE WHEN s.grade >= 87 AND s.grade < 90 THEN 1 END) as b_plus_count,
          COUNT(CASE WHEN s.grade >= 83 AND s.grade < 87 THEN 1 END) as b_count,
          COUNT(CASE WHEN s.grade >= 80 AND s.grade < 83 THEN 1 END) as b_minus_count,
          COUNT(CASE WHEN s.grade >= 77 AND s.grade < 80 THEN 1 END) as c_plus_count,
          COUNT(CASE WHEN s.grade >= 73 AND s.grade < 77 THEN 1 END) as c_count,
          COUNT(CASE WHEN s.grade >= 70 AND s.grade < 73 THEN 1 END) as c_minus_count,
          COUNT(CASE WHEN s.grade >= 60 AND s.grade < 70 THEN 1 END) as d_count,
          COUNT(CASE WHEN s.grade < 60 THEN 1 END) as f_count
        FROM assignment_submissions s
        WHERE s.assignment_id = $1
      `;
      
      const { rows } = await db.query(query, [assignmentId]);
      const analytics = rows[0];

      // Get time-based analytics
      const timeQuery = `
        SELECT 
          DATE(s.created_at) as submission_date,
          COUNT(*) as submissions_count,
          AVG(s.grade) as daily_average
        FROM assignment_submissions s
        WHERE s.assignment_id = $1 AND s.grade IS NOT NULL
        GROUP BY DATE(s.created_at)
        ORDER BY submission_date
      `;
      
      const { rows: timeData } = await db.query(timeQuery, [assignmentId]);
      analytics.time_distribution = timeData;

      return analytics;
    } catch (error) {
      logger.error(`Failed to get grading analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export grades to CSV format
   */
  static async exportGrades(assignmentId, format = 'csv') {
    try {
      const query = `
        SELECT 
          u.name as student_name,
          u.email as student_email,
          s.grade,
          s.feedback,
          s.status,
          s.created_at as submitted_at,
          s.graded_at,
          CASE 
            WHEN s.created_at <= a.due_date THEN 'On Time'
            ELSE 'Late'
          END as submission_status,
          ls.penalty_percentage,
          ls.days_late
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u ON s.student_id = u.id
        LEFT JOIN late_submissions ls ON s.id = ls.submission_id
        WHERE s.assignment_id = $1
        ORDER BY u.name
      `;
      
      const { rows } = await db.query(query, [assignmentId]);
      
      if (format === 'csv') {
        const headers = [
          'Student Name', 'Email', 'Grade', 'Feedback', 'Status',
          'Submitted At', 'Graded At', 'Submission Status', 'Penalty %', 'Days Late'
        ];
        
        const csvData = [headers.join(',')];
        
        rows.forEach(row => {
          const csvRow = [
            `"${row.student_name}"`,
            row.student_email,
            row.grade || '',
            `"${(row.feedback || '').replace(/"/g, '""')}"`,
            row.status,
            row.submitted_at,
            row.graded_at || '',
            row.submission_status,
            row.penalty_percentage || '',
            row.days_late || ''
          ];
          csvData.push(csvRow.join(','));
        });
        
        return csvData.join('\n');
      }
      
      return rows;
    } catch (error) {
      logger.error(`Failed to export grades: ${error.message}`);
      throw error;
    }
  }
}

module.exports = GradingModel;