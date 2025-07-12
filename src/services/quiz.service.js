const Assignment = require('../models/assignment.model');
const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Quiz Service - Handles quiz validation, grading, and management
 */
class QuizService {
  
  /**
   * Validate quiz question structure
   * @param {Object} question - Quiz question object
   * @param {number} index - Question index for error reporting
   */
  static validateQuestion(question, index = 0) {
    const requiredFields = ['type', 'question', 'points'];
    const validTypes = ['multiple_choice', 'true_false', 'short_answer'];

    // Check required fields
    for (const field of requiredFields) {
      if (!question[field]) {
        throw new Error(`Missing required field '${field}' in question ${index + 1}`);
      }
    }

    // Validate question type
    if (!validTypes.includes(question.type)) {
      throw new Error(`Invalid question type '${question.type}' in question ${index + 1}. Valid types: ${validTypes.join(', ')}`);
    }

    // Validate points
    if (typeof question.points !== 'number' || question.points <= 0) {
      throw new Error(`Points must be a positive number in question ${index + 1}`);
    }

    // Validate type-specific requirements
    switch (question.type) {
      case 'multiple_choice':
        this.validateMultipleChoiceQuestion(question, index);
        break;
      case 'true_false':
        this.validateTrueFalseQuestion(question, index);
        break;
      case 'short_answer':
        this.validateShortAnswerQuestion(question, index);
        break;
    }

    return true;
  }

  /**
   * Validate multiple choice question
   */
  static validateMultipleChoiceQuestion(question, index) {
    if (!Array.isArray(question.options) || question.options.length < 2) {
      throw new Error(`Multiple choice question ${index + 1} must have at least 2 options`);
    }

    if (!question.correct_answer) {
      throw new Error(`Multiple choice question ${index + 1} must have a correct answer`);
    }

    if (!question.options.includes(question.correct_answer)) {
      throw new Error(`Correct answer for question ${index + 1} must be one of the provided options`);
    }

    // Check for duplicate options
    const uniqueOptions = [...new Set(question.options)];
    if (uniqueOptions.length !== question.options.length) {
      throw new Error(`Multiple choice question ${index + 1} has duplicate options`);
    }
  }

  /**
   * Validate true/false question
   */
  static validateTrueFalseQuestion(question, index) {
    const validAnswers = ['true', 'false', true, false];
    
    if (!validAnswers.includes(question.correct_answer)) {
      throw new Error(`True/false question ${index + 1} must have 'true' or 'false' as correct answer`);
    }
  }

  /**
   * Validate short answer question
   */
  static validateShortAnswerQuestion(question, index) {
    if (!question.correct_answer || typeof question.correct_answer !== 'string' || question.correct_answer.trim().length === 0) {
      throw new Error(`Short answer question ${index + 1} must have a non-empty correct answer`);
    }

    // Optional: validate acceptable answers array
    if (question.acceptable_answers && !Array.isArray(question.acceptable_answers)) {
      throw new Error(`Acceptable answers for question ${index + 1} must be an array`);
    }
  }

  /**
   * Validate entire quiz structure
   * @param {Array} questions - Array of quiz questions
   */
  static validateQuiz(questions) {
    if (!Array.isArray(questions)) {
      throw new Error('Quiz questions must be an array');
    }

    if (questions.length === 0) {
      throw new Error('Quiz must have at least one question');
    }

    // Validate each question
    questions.forEach((question, index) => {
      this.validateQuestion(question, index);
    });

    // Calculate total points
    const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
    
    return {
      isValid: true,
      questionCount: questions.length,
      totalPoints
    };
  }

  /**
   * Grade a quiz submission
   * @param {Array} questions - Original quiz questions
   * @param {Object} answers - Student's answers
   * @param {Object} options - Grading options
   */
  static gradeQuiz(questions, answers, options = {}) {
    const {
      caseSensitive = false,
      partialCredit = false,
      allowMultipleAnswers = false
    } = options;

    let totalScore = 0;
    let maxScore = 0;
    const gradingDetails = [];

    questions.forEach((question, index) => {
      const questionId = question.id || index;
      const studentAnswer = answers[questionId];
      const questionResult = this.gradeQuestion(question, studentAnswer, {
        caseSensitive,
        partialCredit,
        allowMultipleAnswers
      });

      totalScore += questionResult.score;
      maxScore += question.points;
      gradingDetails.push({
        questionId,
        questionType: question.type,
        question: question.question,
        studentAnswer,
        correctAnswer: question.correct_answer,
        score: questionResult.score,
        maxPoints: question.points,
        isCorrect: questionResult.isCorrect,
        feedback: questionResult.feedback
      });
    });

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    return {
      totalScore,
      maxScore,
      percentage: Math.round(percentage * 100) / 100,
      letterGrade: this.calculateLetterGrade(percentage),
      gradingDetails,
      submissionTime: new Date().toISOString()
    };
  }

  /**
   * Grade individual question
   */
  static gradeQuestion(question, studentAnswer, options = {}) {
    const { caseSensitive = false, partialCredit = false } = options;

    let score = 0;
    let isCorrect = false;
    let feedback = '';

    if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') {
      feedback = 'No answer provided';
      return { score, isCorrect, feedback };
    }

    switch (question.type) {
      case 'multiple_choice':
        isCorrect = studentAnswer === question.correct_answer;
        score = isCorrect ? question.points : 0;
        feedback = isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${question.correct_answer}`;
        break;

      case 'true_false':
        const normalizedStudentAnswer = String(studentAnswer).toLowerCase();
        const normalizedCorrectAnswer = String(question.correct_answer).toLowerCase();
        isCorrect = normalizedStudentAnswer === normalizedCorrectAnswer;
        score = isCorrect ? question.points : 0;
        feedback = isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${question.correct_answer}`;
        break;

      case 'short_answer':
        const result = this.gradeShortAnswer(question, studentAnswer, { caseSensitive, partialCredit });
        score = result.score;
        isCorrect = result.isCorrect;
        feedback = result.feedback;
        break;

      default:
        feedback = 'Unknown question type';
    }

    return { score, isCorrect, feedback };
  }

  /**
   * Grade short answer question with partial credit support
   */
  static gradeShortAnswer(question, studentAnswer, options = {}) {
    const { caseSensitive = false, partialCredit = false } = options;
    
    let score = 0;
    let isCorrect = false;
    let feedback = '';

    const normalizeAnswer = (answer) => {
      let normalized = String(answer).trim();
      if (!caseSensitive) {
        normalized = normalized.toLowerCase();
      }
      return normalized;
    };

    const studentNormalized = normalizeAnswer(studentAnswer);
    const correctNormalized = normalizeAnswer(question.correct_answer);

    // Check exact match first
    if (studentNormalized === correctNormalized) {
      score = question.points;
      isCorrect = true;
      feedback = 'Correct!';
      return { score, isCorrect, feedback };
    }

    // Check acceptable answers if provided
    if (question.acceptable_answers && Array.isArray(question.acceptable_answers)) {
      for (const acceptableAnswer of question.acceptable_answers) {
        if (studentNormalized === normalizeAnswer(acceptableAnswer)) {
          score = question.points;
          isCorrect = true;
          feedback = 'Correct!';
          return { score, isCorrect, feedback };
        }
      }
    }

    // Partial credit based on similarity (if enabled)
    if (partialCredit) {
      const similarity = this.calculateStringSimilarity(studentNormalized, correctNormalized);
      if (similarity >= 0.8) {
        score = Math.round(question.points * similarity);
        feedback = `Partially correct (${Math.round(similarity * 100)}% match)`;
      } else if (similarity >= 0.5) {
        score = Math.round(question.points * 0.3);
        feedback = 'Some credit given for partial match';
      } else {
        feedback = `Incorrect. The correct answer is: ${question.correct_answer}`;
      }
    } else {
      feedback = `Incorrect. The correct answer is: ${question.correct_answer}`;
    }

    return { score, isCorrect, feedback };
  }

  /**
   * Calculate string similarity (Levenshtein distance based)
   */
  static calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  static levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate letter grade from percentage
   */
  static calculateLetterGrade(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate quiz statistics
   */
  static async getQuizStatistics(assignmentId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_submissions,
          ROUND(AVG(grade), 2) as average_grade,
          MAX(grade) as highest_grade,
          MIN(grade) as lowest_grade,
          COUNT(CASE WHEN grade >= 90 THEN 1 END) as a_grades,
          COUNT(CASE WHEN grade >= 80 AND grade < 90 THEN 1 END) as b_grades,
          COUNT(CASE WHEN grade >= 70 AND grade < 80 THEN 1 END) as c_grades,
          COUNT(CASE WHEN grade >= 60 AND grade < 70 THEN 1 END) as d_grades,
          COUNT(CASE WHEN grade < 60 THEN 1 END) as f_grades
        FROM assignment_submissions 
        WHERE assignment_id = $1 AND grade IS NOT NULL
      `;

      const { rows } = await db.query(query, [assignmentId]);
      return rows[0];
    } catch (error) {
      logger.error(`Failed to get quiz statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Auto-grade quiz submission
   */
  static async autoGradeSubmission(submissionId) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Get submission and assignment details
      const submissionQuery = `
        SELECT s.*, a.quiz_questions_json, a.max_score
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.id = $1
      `;
      
      const { rows: submissions } = await client.query(submissionQuery, [submissionId]);
      const submission = submissions[0];

      if (!submission) {
        throw new Error('Submission not found');
      }

      if (!submission.quiz_questions_json) {
        throw new Error('Assignment is not a quiz or has no questions');
      }

      const questions = typeof submission.quiz_questions_json === 'string' 
        ? JSON.parse(submission.quiz_questions_json)
        : submission.quiz_questions_json;

      const answers = typeof submission.quiz_answers_json === 'string'
        ? JSON.parse(submission.quiz_answers_json)
        : submission.quiz_answers_json;

      // Grade the quiz
      const gradingResult = this.gradeQuiz(questions, answers, {
        caseSensitive: false,
        partialCredit: true
      });

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

      const feedback = JSON.stringify({
        gradingDetails: gradingResult.gradingDetails,
        totalScore: gradingResult.totalScore,
        maxScore: gradingResult.maxScore,
        percentage: gradingResult.percentage,
        letterGrade: gradingResult.letterGrade,
        autoGraded: true,
        gradedAt: new Date().toISOString()
      });

      const { rows: updatedSubmissions } = await client.query(updateQuery, [
        gradingResult.totalScore,
        feedback,
        submissionId
      ]);

      await client.query('COMMIT');

      logger.info(`Auto-graded quiz submission ${submissionId}: ${gradingResult.totalScore}/${gradingResult.maxScore}`);

      return {
        submission: updatedSubmissions[0],
        gradingResult
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to auto-grade submission: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Randomize quiz questions
   */
  static randomizeQuestions(questions, options = {}) {
    const { shuffleQuestions = true, shuffleOptions = true } = options;
    
    let randomizedQuestions = [...questions];

    if (shuffleQuestions) {
      randomizedQuestions = this.shuffleArray(randomizedQuestions);
    }

    if (shuffleOptions) {
      randomizedQuestions = randomizedQuestions.map(question => {
        if (question.type === 'multiple_choice' && question.options) {
          return {
            ...question,
            options: this.shuffleArray([...question.options])
          };
        }
        return question;
      });
    }

    return randomizedQuestions;
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = QuizService;