const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const assignmentValidation = require('../middleware/validation/assignment.validation');
const assignmentController = require('../controllers/assignment.controller');

const router = express.Router();

router
    .route('/')
    .post(authorize(['admin', 'teacher']), validate(assignmentValidation.createAssignment), assignmentController.createAssignment)
    .get(authorize('getAssignments'), validate(assignmentValidation.getAssignments), assignmentController.getAssignments);

router
    .route('/:assignmentId')
    .get(authorize('getAssignment'), validate(assignmentValidation.getAssignment), assignmentController.getAssignment);

module.exports = router;
