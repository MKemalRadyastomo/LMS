const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const assignmentValidation = require('../middleware/validation/assignment.validation');
const assignmentController = require('../controllers/assignment.controller');

const router = express.Router();

router
    .route('/:assignmentId')
    .get(authorize('getAssignment'), validate(assignmentValidation.getAssignment), assignmentController.getAssignment);

router
    .route('/')
    .get(authorize('getAssignmentsByCourse'), assignmentController.getAssignmentsByCourse);

router
    .route('/:courseId')
    .post(authorize('createAssignment'), validate(assignmentValidation.createAssignment), assignmentController.createAssignment);

module.exports = router;
