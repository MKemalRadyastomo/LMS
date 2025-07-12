const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const gradingController = require('../controllers/grading.controller');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Apply authentication to all grading routes
router.use(authenticate);

/**
 * Rubric Management Routes
 */

// Create rubric for assignment
router.post(
  '/assignments/:assignmentId/rubrics',
  requireRole(['admin', 'guru']),
  gradingController.createRubric
);

// Get rubric for assignment
router.get(
  '/assignments/:assignmentId/rubrics',
  requireRole(['admin', 'guru', 'siswa']),
  gradingController.getRubric
);

// Update rubric
router.put(
  '/rubrics/:rubricId',
  requireRole(['admin', 'guru']),
  gradingController.updateRubric
);

// Delete rubric
router.delete(
  '/rubrics/:rubricId',
  requireRole(['admin', 'guru']),
  gradingController.deleteRubric
);

// Calculate rubric grade
router.post(
  '/rubrics/:rubricId/calculate',
  requireRole(['admin', 'guru']),
  gradingController.calculateRubricGrade
);

/**
 * Grade Management Routes
 */

// Submit grade for submission
router.post(
  '/submissions/:submissionId/grade',
  requireRole(['admin', 'guru']),
  gradingController.submitGrade
);

// Get grades for assignment
router.get(
  '/assignments/:assignmentId/grades',
  requireRole(['admin', 'guru', 'siswa']),
  gradingController.getAssignmentGrades
);

// Get grade statistics for assignment
router.get(
  '/assignments/:assignmentId/statistics',
  requireRole(['admin', 'guru']),
  gradingController.getGradeStatistics
);

// Get comprehensive grading analytics
router.get(
  '/assignments/:assignmentId/analytics',
  requireRole(['admin', 'guru']),
  gradingController.getGradingAnalytics
);

// Auto-grade assignment (for quiz assignments)
router.post(
  '/assignments/:assignmentId/auto-grade',
  requireRole(['admin', 'guru']),
  gradingController.autoGradeAssignment
);

// Bulk grade submissions
router.post(
  '/grades/bulk',
  requireRole(['admin', 'guru']),
  gradingController.bulkGradeSubmissions
);

// Export grade report
router.get(
  '/assignments/:assignmentId/export',
  requireRole(['admin', 'guru']),
  gradingController.exportGradeReport
);

// Get student course grades
router.get(
  '/students/:studentId/courses/:courseId/grades',
  requireRole(['admin', 'guru', 'siswa']),
  gradingController.getStudentCourseGrades
);

module.exports = router;