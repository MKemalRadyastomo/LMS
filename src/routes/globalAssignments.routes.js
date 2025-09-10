const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');

/**
 * Global Assignment Routes (Frontend Compatibility)
 * These routes provide course-agnostic assignment operations
 * to match frontend API expectations
 */

/**
 * @route GET /api/assignments
 * @desc Get all assignments across all courses for the authenticated user
 * @access Private
 */
router.get('/', authMiddleware, assignmentController.getAllAssignmentsForUser);

/**
 * @route POST /api/assignments
 * @desc Create a new assignment (requires courseId in body)
 * @access Private (Teachers/Admin only)
 */
router.post('/', authMiddleware, rbacMiddleware(['guru', 'admin']), async (req, res) => {
  try {
    const { courseId, ...assignmentData } = req.body;
    
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'courseId is required in request body'
      });
    }

    // Set the courseId in params for the existing controller
    req.params.courseId = courseId;
    await assignmentController.createAssignment(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating assignment',
      error: error.message
    });
  }
});

/**
 * @route GET /api/assignments/:id
 * @desc Get assignment by ID
 * @access Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id: assignmentId } = req.params;
    const { id: userId, role } = req.user;

    const assignmentService = require('../services/assignment.service');
    const assignment = await assignmentService.getAssignmentById(assignmentId);
    
    // Role-based access control
    if (role === 'siswa') {
      const Enrollment = require('../models/enrollment.model');
      const enrollment = await Enrollment.findByCourseAndStudent(assignment.course_id, userId);
      if (!enrollment || enrollment.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'You are not enrolled in this course'
        });
      }
    } else if (role === 'guru') {
      const Course = require('../models/course.model');
      const course = await Course.findById(assignment.course_id);
      if (!course || course.teacher_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this assignment'
        });
      }
    }
    // Admins can access all assignments

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assignment',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/assignments/:id
 * @desc Update assignment by ID
 * @access Private (Teachers/Admin only)
 */
router.put('/:id', authMiddleware, rbacMiddleware(['guru', 'admin']), async (req, res) => {
  try {
    await assignmentController.updateAssignment(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating assignment',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/assignments/:id
 * @desc Delete assignment by ID
 * @access Private (Teachers/Admin only)
 */
router.delete('/:id', authMiddleware, rbacMiddleware(['guru', 'admin']), async (req, res) => {
  try {
    await assignmentController.deleteAssignment(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting assignment',
      error: error.message
    });
  }
});

/**
 * @route POST /api/assignments/:id/duplicate
 * @desc Duplicate an assignment
 * @access Private (Teachers/Admin only)
 */
router.post('/:id/duplicate', authMiddleware, rbacMiddleware(['guru', 'admin']), async (req, res) => {
  try {
    await assignmentController.duplicateAssignment(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error duplicating assignment',
      error: error.message
    });
  }
});

module.exports = router;