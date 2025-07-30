const GradingModel = require('../models/grading.model');
const QuizService = require('./quiz.service');
const Assignment = require('../models/assignment.model');
const db = require('../config/db');
const logger = require('../utils/logger');
const PDFLib = require('pdf-lib');
const ExcelJS = require('exceljs');

/**
 * Grading Service - Business logic for grading operations
 */
class GradingService {

  /**
   * Calculate rubric-based grade
   * @param {Object} rubric - Grading rubric
   * @param {Object} scores - Criterion scores
   */
  static async calculateRubricGrade(rubric, scores) {
    try {
      if (!rubric || !rubric.criteria) {
        throw new Error('Invalid rubric provided');
      }

      let totalScore = 0;
      let maxScore = 0;
      const breakdown = {};

      for (const criterion of rubric.criteria) {
        const criterionId = criterion.id || criterion.name;
        const score = scores[criterionId] || 0;
        
        // Validate score against criterion max points
        if (score > criterion.maxPoints) {
          throw new Error(`Score ${score} exceeds maximum ${criterion.maxPoints} for criterion: ${criterion.name}`);
        }

        totalScore += score;
        maxScore += criterion.maxPoints;
        breakdown[criterionId] = {
          name: criterion.name,
          score,
          maxPoints: criterion.maxPoints,
          percentage: (score / criterion.maxPoints) * 100
        };
      }

      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      return {
        totalScore,
        maxScore,
        percentage: Math.round(percentage * 100) / 100,
        letterGrade: this.calculateLetterGrade(percentage),
        breakdown,
        rubricId: rubric.id
      };
    } catch (error) {
      logger.error(`Failed to calculate rubric grade: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate letter grade from percentage
   */
  static calculateLetterGrade(percentage) {
    if (percentage >= 95) return 'A+';
    if (percentage >= 90) return 'A';
    if (percentage >= 87) return 'A-';
    if (percentage >= 83) return 'B+';
    if (percentage >= 80) return 'B';
    if (percentage >= 77) return 'B-';
    if (percentage >= 73) return 'C+';
    if (percentage >= 70) return 'C';
    if (percentage >= 67) return 'C-';
    if (percentage >= 63) return 'D+';
    if (percentage >= 60) return 'D';
    if (percentage >= 57) return 'D-';
    return 'F';
  }

  /**
   * Generate comprehensive grading analytics
   */
  static async generateGradingAnalytics(assignmentId) {
    try {
      const [assignment, statistics, grades] = await Promise.all([
        Assignment.findById(assignmentId),
        GradingModel.getGradeStatistics(assignmentId),
        GradingModel.getGradesByAssignment(assignmentId, { graded: true })
      ]);

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      const analytics = {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          type: assignment.type,
          maxScore: assignment.max_score,
          dueDate: assignment.due_date
        },
        statistics,
        gradeDistribution: this.calculateGradeDistribution(grades),
        performanceMetrics: this.calculatePerformanceMetrics(grades, assignment.max_score),
        timeline: await this.getGradingTimeline(assignmentId)
      };

      // Add quiz-specific analytics if it's a quiz
      if (assignment.type === 'quiz' && assignment.quiz_questions_json) {
        analytics.quizAnalytics = await QuizService.getQuizStatistics(assignmentId);
        analytics.questionAnalytics = this.analyzeQuizQuestions(grades, assignment.quiz_questions_json);
      }

      return analytics;
    } catch (error) {
      logger.error(`Failed to generate grading analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate grade distribution
   */
  static calculateGradeDistribution(grades) {
    const distribution = {
      'A+': 0, 'A': 0, 'A-': 0,
      'B+': 0, 'B': 0, 'B-': 0,
      'C+': 0, 'C': 0, 'C-': 0,
      'D+': 0, 'D': 0, 'D-': 0,
      'F': 0
    };

    grades.forEach(grade => {
      if (grade.grade !== null) {
        const percentage = (grade.grade / grade.max_score) * 100;
        const letterGrade = this.calculateLetterGrade(percentage);
        distribution[letterGrade]++;
      }
    });

    return distribution;
  }

  /**
   * Calculate performance metrics
   */
  static calculatePerformanceMetrics(grades, maxScore) {
    const gradedSubmissions = grades.filter(g => g.grade !== null);
    
    if (gradedSubmissions.length === 0) {
      return {
        completionRate: 0,
        averageScore: 0,
        averagePercentage: 0,
        standardDeviation: 0,
        passingRate: 0
      };
    }

    const scores = gradedSubmissions.map(g => g.grade);
    const percentages = gradedSubmissions.map(g => (g.grade / maxScore) * 100);
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const meanPercentage = percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length;
    
    // Calculate standard deviation
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate passing rate (60% or higher)
    const passingGrades = percentages.filter(pct => pct >= 60).length;
    const passingRate = (passingGrades / percentages.length) * 100;

    return {
      completionRate: (gradedSubmissions.length / grades.length) * 100,
      averageScore: Math.round(mean * 100) / 100,
      averagePercentage: Math.round(meanPercentage * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      passingRate: Math.round(passingRate * 100) / 100
    };
  }

  /**
   * Get grading timeline
   */
  static async getGradingTimeline(assignmentId) {
    try {
      const query = `
        SELECT 
          DATE(updated_at) as date,
          COUNT(*) as graded_count
        FROM assignment_submissions 
        WHERE assignment_id = $1 AND grade IS NOT NULL
        GROUP BY DATE(updated_at)
        ORDER BY date ASC
      `;

      const { rows } = await db.query(query, [assignmentId]);
      return rows;
    } catch (error) {
      logger.error(`Failed to get grading timeline: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze quiz questions performance
   */
  static analyzeQuizQuestions(grades, quizQuestions) {
    try {
      const questions = typeof quizQuestions === 'string' 
        ? JSON.parse(quizQuestions) 
        : quizQuestions;

      const questionAnalytics = questions.map((question, index) => {
        const questionId = question.id || index;
        let correctCount = 0;
        let totalAnswered = 0;

        grades.forEach(grade => {
          if (grade.feedback && grade.feedback.gradingDetails) {
            const details = grade.feedback.gradingDetails.find(d => d.questionId === questionId);
            if (details) {
              totalAnswered++;
              if (details.isCorrect) {
                correctCount++;
              }
            }
          }
        });

        return {
          questionId,
          question: question.question,
          type: question.type,
          points: question.points,
          correctCount,
          totalAnswered,
          correctPercentage: totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0,
          difficulty: this.classifyQuestionDifficulty(correctCount, totalAnswered)
        };
      });

      return questionAnalytics;
    } catch (error) {
      logger.error(`Failed to analyze quiz questions: ${error.message}`);
      return [];
    }
  }

  /**
   * Classify question difficulty based on success rate
   */
  static classifyQuestionDifficulty(correctCount, totalAnswered) {
    if (totalAnswered === 0) return 'Unknown';
    
    const successRate = (correctCount / totalAnswered) * 100;
    
    if (successRate >= 80) return 'Easy';
    if (successRate >= 60) return 'Medium';
    if (successRate >= 40) return 'Hard';
    return 'Very Hard';
  }

  /**
   * Generate grade report in PDF format
   */
  static async generatePDFReport(assignmentId, options = {}) {
    try {
      const analytics = await this.generateGradingAnalytics(assignmentId);
      const grades = await GradingModel.getGradesByAssignment(assignmentId);

      const pdfDoc = await PDFLib.PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      
      const { width, height } = page.getSize();
      const fontSize = 12;

      let yPosition = height - 50;

      // Title
      page.drawText(`Grade Report: ${analytics.assignment.title}`, {
        x: 50,
        y: yPosition,
        size: 18,
        color: PDFLib.rgb(0, 0, 0)
      });

      yPosition -= 40;

      // Statistics
      const stats = analytics.statistics;
      const statsText = [
        `Total Submissions: ${stats.total_submissions}`,
        `Graded: ${stats.graded_count}`,
        `Average Grade: ${stats.average_grade || 'N/A'}`,
        `Highest Grade: ${stats.highest_grade || 'N/A'}`,
        `Lowest Grade: ${stats.lowest_grade || 'N/A'}`
      ];

      statsText.forEach(text => {
        page.drawText(text, {
          x: 50,
          y: yPosition,
          size: fontSize,
          color: PDFLib.rgb(0, 0, 0)
        });
        yPosition -= 20;
      });

      yPosition -= 20;

      // Individual grades
      page.drawText('Individual Grades:', {
        x: 50,
        y: yPosition,
        size: 14,
        color: PDFLib.rgb(0, 0, 0)
      });

      yPosition -= 30;

      grades.forEach(grade => {
        if (yPosition < 50) {
          // Add new page if needed
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = height - 50;
        }

        const gradeText = `${grade.student_name}: ${grade.grade || 'Not Graded'} / ${analytics.assignment.maxScore}`;
        page.drawText(gradeText, {
          x: 50,
          y: yPosition,
          size: fontSize,
          color: PDFLib.rgb(0, 0, 0)
        });
        yPosition -= 20;
      });

      const pdfBytes = await pdfDoc.save();
      
      return {
        buffer: Buffer.from(pdfBytes),
        filename: `grade_report_${assignmentId}_${Date.now()}.pdf`,
        contentType: 'application/pdf'
      };
    } catch (error) {
      logger.error(`Failed to generate PDF report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate grade report in Excel format
   */
  static async generateExcelReport(assignmentId, options = {}) {
    try {
      const analytics = await this.generateGradingAnalytics(assignmentId);
      const grades = await GradingModel.getGradesByAssignment(assignmentId);

      // Create workbook
      const workbook = new ExcelJS.Workbook();

      // Grades sheet
      const gradesSheet = workbook.addWorksheet('Grades');
      const gradesData = grades.map(grade => ({
        'Student Name': grade.student_name,
        'Student Email': grade.student_email,
        'Grade': grade.grade || 'Not Graded',
        'Max Score': analytics.assignment.maxScore,
        'Percentage': grade.grade ? `${((grade.grade / analytics.assignment.maxScore) * 100).toFixed(2)}%` : 'N/A',
        'Letter Grade': grade.grade ? this.calculateLetterGrade((grade.grade / analytics.assignment.maxScore) * 100) : 'N/A',
        'Status': grade.status,
        'Submitted At': grade.created_at ? new Date(grade.created_at).toLocaleString() : 'Not Submitted'
      }));

      // Add headers
      if (gradesData.length > 0) {
        gradesSheet.columns = Object.keys(gradesData[0]).map(key => ({
          header: key,
          key: key,
          width: 15
        }));
        gradesSheet.addRows(gradesData);
      }

      // Statistics sheet
      const statsSheet = workbook.addWorksheet('Statistics');
      const stats = analytics.statistics;
      const statsData = [
        { Metric: 'Total Submissions', Value: stats.total_submissions },
        { Metric: 'Graded Count', Value: stats.graded_count },
        { Metric: 'Average Grade', Value: stats.average_grade || 'N/A' },
        { Metric: 'Highest Grade', Value: stats.highest_grade || 'N/A' },
        { Metric: 'Lowest Grade', Value: stats.lowest_grade || 'N/A' },
        { Metric: 'Median Grade', Value: stats.median_grade || 'N/A' }
      ];

      statsSheet.columns = [
        { header: 'Metric', key: 'Metric', width: 20 },
        { header: 'Value', key: 'Value', width: 15 }
      ];
      statsSheet.addRows(statsData);

      // Grade distribution sheet
      const distributionSheet = workbook.addWorksheet('Grade Distribution');
      const distributionData = Object.entries(analytics.gradeDistribution).map(([grade, count]) => ({
        'Letter Grade': grade,
        'Count': count,
        'Percentage': stats.graded_count > 0 ? `${((count / stats.graded_count) * 100).toFixed(2)}%` : '0%'
      }));

      distributionSheet.columns = [
        { header: 'Letter Grade', key: 'Letter Grade', width: 15 },
        { header: 'Count', key: 'Count', width: 10 },
        { header: 'Percentage', key: 'Percentage', width: 15 }
      ];
      distributionSheet.addRows(distributionData);

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return {
        buffer,
        filename: `grade_report_${assignmentId}_${Date.now()}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } catch (error) {
      logger.error(`Failed to generate Excel report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Auto-grade assignment based on type
   */
  static async autoGradeAssignment(assignmentId) {
    try {
      const assignment = await Assignment.findById(assignmentId);
      
      if (!assignment) {
        throw new Error('Assignment not found');
      }

      if (assignment.type === 'quiz') {
        return await this.autoGradeQuizAssignment(assignmentId);
      } else {
        throw new Error(`Auto-grading not supported for assignment type: ${assignment.type}`);
      }
    } catch (error) {
      logger.error(`Failed to auto-grade assignment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Auto-grade quiz assignment
   */
  static async autoGradeQuizAssignment(assignmentId) {
    try {
      // Get ungraded quiz submissions
      const submissions = await GradingModel.getGradesByAssignment(assignmentId, { graded: false });
      const results = [];

      for (const submission of submissions) {
        try {
          const result = await QuizService.autoGradeSubmission(submission.id);
          results.push({
            submissionId: submission.id,
            studentName: submission.student_name,
            grade: result.gradingResult.totalScore,
            success: true
          });
        } catch (error) {
          logger.error(`Failed to auto-grade submission ${submission.id}: ${error.message}`);
          results.push({
            submissionId: submission.id,
            studentName: submission.student_name,
            error: error.message,
            success: false
          });
        }
      }

      return {
        assignmentId,
        totalProcessed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      logger.error(`Failed to auto-grade quiz assignment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate course grade for student
   */
  static async calculateCourseGrade(studentId, courseId) {
    try {
      const grades = await GradingModel.getStudentCourseGrades(studentId, courseId);
      
      const gradedAssignments = grades.filter(g => g.grade !== null);
      
      if (gradedAssignments.length === 0) {
        return {
          totalPoints: 0,
          earnedPoints: 0,
          percentage: 0,
          letterGrade: 'N/A',
          completedAssignments: 0,
          totalAssignments: grades.length
        };
      }

      const totalPoints = gradedAssignments.reduce((sum, g) => sum + g.max_score, 0);
      const earnedPoints = gradedAssignments.reduce((sum, g) => sum + g.grade, 0);
      const percentage = (earnedPoints / totalPoints) * 100;

      return {
        totalPoints,
        earnedPoints,
        percentage: Math.round(percentage * 100) / 100,
        letterGrade: this.calculateLetterGrade(percentage),
        completedAssignments: gradedAssignments.length,
        totalAssignments: grades.length,
        grades: grades
      };
    } catch (error) {
      logger.error(`Failed to calculate course grade: ${error.message}`);
      throw error;
    }
  }
}

module.exports = GradingService;