const { default: httpStatus } = require('http-status');
const catchAsync = require('../utils/catchAsync');
const GradingModel = require('../models/grading.model');
const GradingService = require('../services/grading.service');
const Assignment = require('../models/assignment.model');
const { ApiError } = require('../utils/ApiError');
const { authenticate, requireRole, requirePermission } = require('../middleware/rbac');
const logger = require('../utils/logger');

/**
 * Create grading rubric
 */
const createRubric = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;
  const { name, total_points, criteria } = req.body;

  // Verify assignment exists and user has permission
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Check if user has permission to create rubric for this assignment
  if (req.user.role === 'guru') {
    const course = await require('../models/course.model').findById(assignment.course_id);
    if (!course || course.teacher_id !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to create rubric for this assignment');
    }
  } else if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can create rubrics');
  }

  const rubricData = {
    assignment_id: assignmentId,
    name,
    total_points,
    criteria
  };

  const rubric = await GradingModel.createRubric(rubricData);

  res.status(httpStatus.CREATED).json({
    success: true,
    data: rubric
  });
});

/**
 * Get rubric for assignment
 */
const getRubric = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;

  const rubric = await GradingModel.getRubricByAssignmentId(assignmentId);

  if (!rubric) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Rubric not found for this assignment');
  }

  res.json({
    success: true,
    data: rubric
  });
});

/**
 * Update grading rubric
 */
const updateRubric = catchAsync(async (req, res) => {
  const { rubricId } = req.params;
  const { name, total_points, criteria } = req.body;

  // Get rubric to verify assignment ownership
  const rubric = await GradingModel.getRubricById(rubricId);
  if (!rubric) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Rubric not found');
  }

  const assignment = await Assignment.findById(rubric.assignment_id);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Check permissions
  if (req.user.role === 'guru') {
    const course = await require('../models/course.model').findById(assignment.course_id);
    if (!course || course.teacher_id !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to update this rubric');
    }
  } else if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can update rubrics');
  }

  const updatedRubric = await GradingModel.updateRubric(rubricId, {
    name,
    total_points,
    criteria
  });

  res.json({
    success: true,
    data: updatedRubric
  });
});

/**
 * Delete grading rubric
 */
const deleteRubric = catchAsync(async (req, res) => {
  const { rubricId } = req.params;

  // Get rubric to verify assignment ownership
  const rubric = await GradingModel.getRubricById(rubricId);
  if (!rubric) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Rubric not found');
  }

  const assignment = await Assignment.findById(rubric.assignment_id);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Check permissions
  if (req.user.role === 'guru') {
    const course = await require('../models/course.model').findById(assignment.course_id);
    if (!course || course.teacher_id !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to delete this rubric');
    }
  } else if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can delete rubrics');
  }

  await GradingModel.deleteRubric(rubricId);

  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Submit grade for assignment submission
 */
const submitGrade = catchAsync(async (req, res) => {
  const { submissionId } = req.params;
  const { grade, feedback, rubric_scores } = req.body;

  // Get submission to verify permissions
  const submissionQuery = `
    SELECT s.*, a.course_id, a.max_score
    FROM assignment_submissions s
    JOIN assignments a ON s.assignment_id = a.id
    WHERE s.id = $1
  `;

  const { rows: submissions } = await require('../config/db').query(submissionQuery, [submissionId]);
  
  if (submissions.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Submission not found');
  }

  const submission = submissions[0];

  // Check permissions
  if (req.user.role === 'guru') {
    const course = await require('../models/course.model').findById(submission.course_id);
    if (!course || course.teacher_id !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to grade this submission');
    }
  } else if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can submit grades');
  }

  const gradeData = {
    grade,
    feedback,
    rubric_scores,
    graded_by: req.user.id
  };

  const gradedSubmission = await GradingModel.submitGrade(submissionId, gradeData);

  res.json({
    success: true,
    data: gradedSubmission
  });
});

/**
 * Get grades for assignment
 */
const getAssignmentGrades = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;
  const { status, graded } = req.query;

  // Verify assignment exists and check permissions
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Check permissions
  if (req.user.role === 'guru') {
    const course = await require('../models/course.model').findById(assignment.course_id);
    if (!course || course.teacher_id !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view grades for this assignment');
    }
  } else if (req.user.role === 'siswa') {
    // Students can only see their own grades
    const filters = { status };
    if (graded !== undefined) {
      filters.graded = graded === 'true';
    }
    
    const studentGrades = await GradingModel.getGradesByAssignment(assignmentId, filters);
    const studentGrade = studentGrades.find(g => g.student_id === req.user.id);
    
    return res.json({
      success: true,
      data: studentGrade ? [studentGrade] : []
    });
  } else if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view grades');
  }

  const filters = { status };
  if (graded !== undefined) {
    filters.graded = graded === 'true';
  }

  const grades = await GradingModel.getGradesByAssignment(assignmentId, filters);

  res.json({
    success: true,
    data: grades
  });
});

/**
 * Get grade statistics for assignment
 */
const getGradeStatistics = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;

  // Verify assignment exists and check permissions
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Check permissions
  if (req.user.role === 'guru') {
    const course = await require('../models/course.model').findById(assignment.course_id);
    if (!course || course.teacher_id !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view statistics for this assignment');
    }
  } else if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can view grade statistics');
  }

  const statistics = await GradingModel.getGradeStatistics(assignmentId);

  res.json({
    success: true,
    data: statistics
  });
});

/**
 * Get comprehensive grading analytics
 */
const getGradingAnalytics = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;

  // Verify assignment exists and check permissions
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Check permissions
  if (req.user.role === 'guru') {
    const course = await require('../models/course.model').findById(assignment.course_id);
    if (!course || course.teacher_id !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view analytics for this assignment');
    }
  } else if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can view grading analytics');
  }

  const analytics = await GradingService.generateGradingAnalytics(assignmentId);

  res.json({
    success: true,
    data: analytics
  });
});

/**
 * Auto-grade assignment (for quiz assignments)
 */
const autoGradeAssignment = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;

  // Verify assignment exists and check permissions
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Check permissions
  if (req.user.role === 'guru') {
    const course = await require('../models/course.model').findById(assignment.course_id);
    if (!course || course.teacher_id !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to auto-grade this assignment');
    }
  } else if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can auto-grade assignments');
  }

  const result = await GradingService.autoGradeAssignment(assignmentId);

  res.json({
    success: true,
    data: result
  });
});

/**
 * Bulk grade submissions
 */
const bulkGradeSubmissions = catchAsync(async (req, res) => {
  const { grades } = req.body;

  if (!Array.isArray(grades) || grades.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Grades array is required and must not be empty');
  }

  // Verify permissions for each submission
  for (const gradeData of grades) {
    const submissionQuery = `
      SELECT s.*, a.course_id
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      WHERE s.id = $1
    `;

    const { rows: submissions } = await require('../config/db').query(submissionQuery, [gradeData.submission_id]);
    
    if (submissions.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, `Submission ${gradeData.submission_id} not found`);
    }

    const submission = submissions[0];

    if (req.user.role === 'guru') {
      const course = await require('../models/course.model').findById(submission.course_id);
      if (!course || course.teacher_id !== req.user.id) {
        throw new ApiError(httpStatus.FORBIDDEN, `Not authorized to grade submission ${gradeData.submission_id}`);
      }
    } else if (req.user.role !== 'admin') {
      throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can bulk grade submissions');
    }

    // Add graded_by field
    gradeData.graded_by = req.user.id;
  }

  const results = await GradingModel.bulkGradeSubmissions(grades);

  res.json({
    success: true,
    data: {
      graded_count: results.length,
      submissions: results
    }
  });
});

/**
 * Export grade report
 */
const exportGradeReport = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;
  const { format = 'pdf' } = req.query;

  // Verify assignment exists and check permissions
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Check permissions
  if (req.user.role === 'guru') {
    const course = await require('../models/course.model').findById(assignment.course_id);
    if (!course || course.teacher_id !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to export grades for this assignment');
    }
  } else if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can export grade reports');
  }

  let report;
  
  if (format === 'pdf') {
    report = await GradingService.generatePDFReport(assignmentId);
  } else if (format === 'excel') {
    report = await GradingService.generateExcelReport(assignmentId);
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid format. Supported formats: pdf, excel');
  }

  res.setHeader('Content-Type', report.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
  res.send(report.buffer);
});

/**
 * Get student course grades
 */
const getStudentCourseGrades = catchAsync(async (req, res) => {
  const { studentId, courseId } = req.params;

  // Check permissions
  if (req.user.role === 'siswa' && req.user.id !== parseInt(studentId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Students can only view their own grades');
  } else if (req.user.role === 'guru') {
    const course = await require('../models/course.model').findById(courseId);
    if (!course || course.teacher_id !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view grades for this course');
    }
  } else if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view student grades');
  }

  const courseGrade = await GradingService.calculateCourseGrade(studentId, courseId);

  res.json({
    success: true,
    data: courseGrade
  });
});

/**
 * Calculate rubric grade
 */
const calculateRubricGrade = catchAsync(async (req, res) => {
  const { rubricId } = req.params;
  const { scores } = req.body;

  const rubric = await GradingModel.getRubricById(rubricId);
  if (!rubric) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Rubric not found');
  }

  const result = await GradingService.calculateRubricGrade(rubric, scores);

  res.json({
    success: true,
    data: result
  });
});

module.exports = {
  createRubric,
  getRubric,
  updateRubric,
  deleteRubric,
  submitGrade,
  getAssignmentGrades,
  getGradeStatistics,
  getGradingAnalytics,
  autoGradeAssignment,
  bulkGradeSubmissions,
  exportGradeReport,
  getStudentCourseGrades,
  calculateRubricGrade
};